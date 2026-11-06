package dev.claude.ears;

import net.minecraft.client.Minecraft;
import net.minecraft.core.BlockPos;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.tags.BlockTags;
import net.minecraft.tags.FluidTags;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.properties.BlockStateProperties;
import net.neoforged.neoforge.client.event.ClientTickEvent;

import java.io.IOException;
import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Set;

/**
 * Lets buddy.mjs keep Claude from freezing in Cold Sweat worlds. Every 2 s it writes coldsweat.json in the game folder:
 * Claude's body and world temperature (read from Cold Sweat by reflection, so the mod still loads without Cold Sweat)
 * the nearest heat source the client can see within 12 blocks (lit campfire, fire, lava, magma, a Hearth...), the
 * nearest drinkable water and bed, whether it is night, and the Realism mod body stats (thirst, sleep, blood).
 */
public final class ColdSense {
    private static final Path FILE = Path.of("coldsweat.json");
    private static final int RANGE = 12;
    private static final Set<String> HEAT = Set.of("minecraft:campfire", "minecraft:soul_campfire", "minecraft:fire",
            "minecraft:soul_fire", "minecraft:lava", "minecraft:magma_block", "minecraft:furnace", "minecraft:blast_furnace",
            "minecraft:smoker", "cold_sweat:hearth_bottom", "cold_sweat:hearth_top", "cold_sweat:boiler");
    private static Method get;
    private static Object body, world;
    private static boolean tried;
    private static int tick;

    private ColdSense() {
    }

    private static void lookUp() {
        tried = true;
        try {
            Class<?> temp = Class.forName("com.momosoftworks.coldsweat.api.util.Temperature");
            Class<?> trait = Class.forName("com.momosoftworks.coldsweat.api.util.Temperature$Trait");
            get = temp.getMethod("get", net.minecraft.world.entity.LivingEntity.class, trait);
            body = trait.getField("BODY").get(null);
            world = trait.getField("WORLD").get(null);
        } catch (ReflectiveOperationException ex) {
            get = null; // Cold Sweat isn't installed: only the heat-source scan runs.
        }
    }

    private static String pos(BlockPos p) {
        return p == null ? "null" : String.format(Locale.ROOT, "{\"x\":%d,\"y\":%d,\"z\":%d}", p.getX(), p.getY(), p.getZ());
    }

    /**
     * The user's Realism mod sends each player their body (thirst and sleep as 0..1 of the way to death, blood in
     * liters, injury bits); read the latest copy by reflection so this still loads without Realism. "null" if absent.
     */
    private static String realism() {
        try {
            Object s = Class.forName("com.jdj125.realism.BodySync").getField("latest").get(null);
            Class<?> c = s.getClass();
            return String.format(Locale.ROOT, "{\"thirst\":%.3f,\"awake\":%.3f,\"stamina\":%.1f,\"blood\":%.2f,\"injuries\":%d,\"bloodType\":\"%s\"}",
                    (float) c.getMethod("thirst").invoke(s), (float) c.getMethod("awake").invoke(s),
                    (float) c.getMethod("stamina").invoke(s), (float) c.getMethod("blood").invoke(s), (int) c.getMethod("injuries").invoke(s),
                    c.getMethod("bloodType").invoke(s));
        } catch (ReflectiveOperationException | RuntimeException ex) {
            return "null";
        }
    }

    private static boolean warm(BlockState s, String id) {
        // Campfires and furnaces only give heat while lit.
        if (s.hasProperty(BlockStateProperties.LIT)) return s.getValue(BlockStateProperties.LIT);
        return HEAT.contains(id);
    }

    public static void onTick(ClientTickEvent.Post e) {
        if (++tick % 40 != 0) return;
        Minecraft mc = Minecraft.getInstance();
        if (mc.level == null || mc.player == null) return;
        if (!tried) lookUp();
        String temps = "";
        if (get != null) {
            try {
                temps = String.format(Locale.ROOT, "\"body\":%.1f,\"world\":%.2f,",
                        (double) get.invoke(null, mc.player, body), (double) get.invoke(null, mc.player, world));
            } catch (ReflectiveOperationException | RuntimeException ignored) {
            }
        }
        BlockPos me = mc.player.blockPosition(), best = null, water = null, bed = null;
        String bestId = null;
        double bestDist = Double.MAX_VALUE, waterDist = Double.MAX_VALUE, bedDist = Double.MAX_VALUE;
        for (BlockPos p : BlockPos.betweenClosed(me.offset(-RANGE, -4, -RANGE), me.offset(RANGE, 4, RANGE))) {
            BlockState s = mc.level.getBlockState(p);
            if (s.isAir()) continue;
            double d = p.distSqr(me);
            // Drinkable water: a source block with open air above it (not frozen over).
            if (s.getFluidState().is(FluidTags.WATER) && s.getFluidState().isSource() && mc.level.getBlockState(p.above()).isAir()) {
                if (d < waterDist) { waterDist = d; water = p.immutable(); }
                continue;
            }
            if (s.is(BlockTags.BEDS)) {
                if (d < bedDist) { bedDist = d; bed = p.immutable(); }
                continue;
            }
            String id = BuiltInRegistries.BLOCK.getKey(s.getBlock()).toString();
            if (!HEAT.contains(id) || !warm(s, id)) continue;
            if (d < bestDist) { bestDist = d; best = p.immutable(); bestId = id; }
        }
        String heat = best == null ? "null" : String.format(Locale.ROOT, "{\"id\":\"%s\",\"x\":%d,\"y\":%d,\"z\":%d}",
                bestId, best.getX(), best.getY(), best.getZ());
        try {
            Files.writeString(FILE, "{" + temps + "\"heat\":" + heat + ",\"water\":" + pos(water) + ",\"bed\":" + pos(bed)
                    + ",\"realism\":" + realism() + ",\"night\":" + !mc.level.isDay() + "}");
        } catch (IOException ex) {
            System.err.println("[claude_ears] could not write coldsweat.json: " + ex);
        }
    }
}
