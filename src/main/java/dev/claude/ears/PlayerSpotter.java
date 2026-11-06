package dev.claude.ears;

import net.minecraft.client.Minecraft;
import net.minecraft.world.entity.player.Player;
import net.neoforged.neoforge.client.event.ClientTickEvent;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.StringJoiner;

/**
 * Lets buddy.mjs follow players on worlds where Claude can't ask the server (a LAN world hosted on another computer,
 * which has no MCPFabric bridge). Twice a second it writes players.json in the game folder: every other player the
 * client currently knows about (in render range), with position, dimension, pose and whether they lie in a bed.
 */
public final class PlayerSpotter {
    private static final Path FILE = Path.of("players.json");
    private static int tick;

    private PlayerSpotter() {
    }

    public static void onTick(ClientTickEvent.Post e) {
        if (++tick % 10 != 0) return;
        Minecraft mc = Minecraft.getInstance();
        if (mc.level == null || mc.player == null) return;
        String dim = mc.level.dimension().location().toString();
        StringJoiner out = new StringJoiner(",", "[", "]");
        for (Player p : mc.level.players()) {
            if (p == mc.player) continue;
            // pose: SLEEPING while not in a bed is how Realism 0.5.0 shows a collapsed player (see buddy.mjs rescue).
            out.add(String.format(java.util.Locale.ROOT, "{\"name\":\"%s\",\"x\":%.2f,\"y\":%.2f,\"z\":%.2f,\"dimension\":\"%s\",\"pose\":\"%s\",\"inBed\":%b}",
                    p.getGameProfile().getName(), p.getX(), p.getY(), p.getZ(), dim, p.getPose(), p.getSleepingPos().isPresent()
                            && p.level().getBlockState(p.getSleepingPos().get()).is(net.minecraft.tags.BlockTags.BEDS)));
        }
        try {
            Files.writeString(FILE, out.toString());
        } catch (IOException ex) {
            System.err.println("[claude_ears] could not write players.json: " + ex);
        }
    }
}
