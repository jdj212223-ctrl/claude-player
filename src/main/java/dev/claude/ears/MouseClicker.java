package dev.claude.ears;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.screens.Screen;
import net.neoforged.neoforge.client.event.ClientTickEvent;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Gives Claude a mouse on open screens, for custom-drawn buttons that have no widget to click (the Interceptors dash
 * display's V/R/I/S tabs). Write "x y" or "x y button" to mouse.txt in the game folder, one click per line, in the
 * screen's own GUI coordinates (the width/height get_ui reports); button 0 is left, 1 right. Each line is a press and
 * release at that spot on the current screen.
 */
public final class MouseClicker {
    private static final Path FILE = Path.of("mouse.txt");
    private static int tick;

    private MouseClicker() {
    }

    public static void onTick(ClientTickEvent.Post e) {
        if (++tick % 5 != 0 || !Files.exists(FILE)) return;
        Screen screen = Minecraft.getInstance().screen;
        try {
            for (String line : Files.readAllLines(FILE)) {
                String[] p = line.trim().split("\\s+");
                if (screen == null || p.length < 2) continue;
                double x = Double.parseDouble(p[0]), y = Double.parseDouble(p[1]);
                int button = p.length > 2 ? Integer.parseInt(p[2]) : 0;
                screen.mouseMoved(x, y);
                screen.mouseClicked(x, y, button);
                screen.mouseReleased(x, y, button);
            }
            Files.delete(FILE);
        } catch (IOException | NumberFormatException ex) {
            System.err.println("[claude_ears] could not click: " + ex);
        }
    }
}
