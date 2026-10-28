package dev.claude.ears;

import net.neoforged.fml.common.Mod;
import net.neoforged.neoforge.common.NeoForge;

/** Voice capture happens in {@link EarsPlugin}, which Simple Voice Chat loads itself; key presses in {@link KeyPresser},
 * mouse clicks on screens in {@link MouseClicker}. */
@Mod("claude_ears")
public class ClaudeEars {
    public ClaudeEars() {
        NeoForge.EVENT_BUS.addListener(KeyPresser::onTick);
        NeoForge.EVENT_BUS.addListener(MouseClicker::onTick);
    }
}
