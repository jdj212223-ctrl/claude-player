package dev.claude.ears;

import net.minecraft.client.KeyMapping;
import net.minecraft.client.Minecraft;
import net.neoforged.neoforge.client.event.ClientTickEvent;

import java.io.IOException;
import java.lang.reflect.Field;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Lets Claude press any key binding, including ones added by other mods (Chromeflesh's hack and claws), by writing
 * its name to keys.txt in the game folder, one per line, e.g. "key.chromeflesh.hack". Each is clicked once.
 */
public final class KeyPresser {
    private static final Path FILE = Path.of("keys.txt");
    private static final Field CLICK_COUNT;
    private static int tick;

    static {
        try {
            CLICK_COUNT = KeyMapping.class.getDeclaredField("clickCount");
            CLICK_COUNT.setAccessible(true);
        } catch (NoSuchFieldException e) {
            throw new IllegalStateException(e);
        }
    }

    private KeyPresser() {
    }

    public static void onTick(ClientTickEvent.Post e) {
        if (++tick % 5 != 0 || !Files.exists(FILE)) return;
        Minecraft mc = Minecraft.getInstance();
        try {
            // Click only the named binding: KeyMapping.click(key) would fire every binding on that key (Nightvein's bite
            // and Simple Voice Chat's menu both sit on V), so bump that one mapping's pending click count instead.
            for (String name : Files.readAllLines(FILE)) {
                for (KeyMapping k : mc.options.keyMappings) {
                    if (k.getName().equals(name.trim())) CLICK_COUNT.setInt(k, CLICK_COUNT.getInt(k) + 1);
                }
            }
            Files.delete(FILE);
        } catch (IOException | IllegalAccessException ex) {
            System.err.println("[claude_ears] could not press keys: " + ex);
        }
    }
}
