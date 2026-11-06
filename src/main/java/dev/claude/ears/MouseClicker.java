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
 * release at that spot on the current screen. "key <name>" presses a keyboard key on the screen instead (space, a, d, w,
 * s, enter, escape, left, right, up, down, or a GLFW key code), for screens that read raw keys, like Tornado Dodge.
 * "scroll x y amount" scrolls the screen at that spot (positive = up, negative = down), for lists, JEI and books.
 */
public final class MouseClicker {
    private static final Path FILE = Path.of("mouse.txt");
    private static int tick;

    private MouseClicker() {
    }

    private static int keyCode(String name) {
        return switch (name.toLowerCase()) {
            case "space" -> 32;
            case "enter" -> 257;
            case "escape" -> 256;
            case "right" -> 262;
            case "left" -> 263;
            case "down" -> 264;
            case "up" -> 265;
            default -> name.length() == 1 ? Character.toUpperCase(name.charAt(0)) : Integer.parseInt(name);
        };
    }

    public static void onTick(ClientTickEvent.Post e) {
        if (++tick % 5 != 0 || !Files.exists(FILE)) return;
        Screen screen = Minecraft.getInstance().screen;
        try {
            for (String line : Files.readAllLines(FILE)) {
                String[] p = line.trim().split("\\s+");
                if (screen == null || p.length < 2) continue;
                if (p[0].equals("scroll") && p.length >= 4) {
                    double sx = Double.parseDouble(p[1]), sy = Double.parseDouble(p[2]);
                    screen.mouseMoved(sx, sy);
                    screen.mouseScrolled(sx, sy, 0, Double.parseDouble(p[3]));
                    continue;
                }
                if (p[0].equals("key")) {
                    int code = keyCode(p[1]);
                    screen.keyPressed(code, 0, 0);
                    if (code >= 'A' && code <= 'Z') screen.charTyped((char) (code + 32), 0);
                    screen.keyReleased(code, 0, 0);
                    continue;
                }
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
