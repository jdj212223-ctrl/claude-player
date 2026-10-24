package dev.claude.ears;

import de.maxhenkel.voicechat.api.ForgeVoicechatPlugin;
import de.maxhenkel.voicechat.api.VoicechatPlugin;
import de.maxhenkel.voicechat.api.events.ClientReceiveSoundEvent;
import de.maxhenkel.voicechat.api.events.EventRegistration;
import de.maxhenkel.voicechat.api.events.MergeClientSoundEvent;
import net.minecraft.client.Minecraft;
import net.minecraft.client.multiplayer.ClientPacketListener;
import net.minecraft.client.multiplayer.PlayerInfo;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/**
 * Collects the voice chat audio Claude's client receives from each nearby speaker. When someone stops talking for a
 * moment, their utterance is written to ears/ as a 16 kHz mono WAV named after them, for the transcriber to pick up.
 */
@ForgeVoicechatPlugin
public class EarsPlugin implements VoicechatPlugin {
    private static final int RATE_IN = 48000, DOWNSAMPLE = 3;
    private static final long SILENCE_MS = 700;
    private static final int MIN_SAMPLES = RATE_IN * 2 / 5, MAX_SAMPLES = RATE_IN * 15;
    private static final Path DIR = Path.of("ears");

    private final Map<UUID, Utterance> speaking = new ConcurrentHashMap<>();

    private static final class Utterance {
        final ByteArrayOutputStream pcm = new ByteArrayOutputStream();
        int samples;
        long lastHeard;
    }

    @Override
    public String getPluginId() {
        return "claude_ears";
    }

    @Override
    public void registerEvents(EventRegistration reg) {
        reg.registerEvent(ClientReceiveSoundEvent.EntitySound.class, e -> hear(e.getEntityId(), e.getRawAudio()));
        reg.registerEvent(ClientReceiveSoundEvent.StaticSound.class, e -> hear(e.getId(), e.getRawAudio()));
        // Claude's own voice: one 20 ms frame of queued speech merged into what this client sends.
        reg.registerEvent(MergeClientSoundEvent.class, e -> {
            short[] frame = Mouth.nextFrame();
            if (frame != null) e.mergeAudio(frame);
        });
        Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "claude-ears");
            t.setDaemon(true);
            return t;
        }).scheduleAtFixedRate(() -> { flushQuiet(); Mouth.poll(); }, 100, 100, TimeUnit.MILLISECONDS);
    }

    private void hear(UUID who, short[] audio) {
        if (audio == null || audio.length == 0) return;
        Utterance u = speaking.computeIfAbsent(who, k -> new Utterance());
        synchronized (u) {
            // 48 kHz -> 16 kHz by averaging each group of three samples, little-endian 16-bit.
            for (int i = 0; i + DOWNSAMPLE <= audio.length; i += DOWNSAMPLE) {
                int s = (audio[i] + audio[i + 1] + audio[i + 2]) / DOWNSAMPLE;
                u.pcm.write(s & 0xFF);
                u.pcm.write((s >> 8) & 0xFF);
            }
            u.samples += audio.length;
            u.lastHeard = System.currentTimeMillis();
        }
        if (u.samples >= MAX_SAMPLES) flush(who);
    }

    private void flushQuiet() {
        long now = System.currentTimeMillis();
        speaking.forEach((who, u) -> {
            if (now - u.lastHeard >= SILENCE_MS) flush(who);
        });
    }

    private void flush(UUID who) {
        Utterance u = speaking.remove(who);
        if (u == null) return;
        byte[] pcm;
        synchronized (u) {
            if (u.samples < MIN_SAMPLES) return;
            pcm = u.pcm.toByteArray();
        }
        try {
            Files.createDirectories(DIR);
            Path tmp = DIR.resolve(System.currentTimeMillis() + "_" + nameOf(who) + ".part");
            Files.write(tmp, wav(pcm));
            Files.move(tmp, DIR.resolve(tmp.getFileName().toString().replace(".part", ".wav")), StandardCopyOption.ATOMIC_MOVE);
        } catch (IOException ex) {
            System.err.println("[claude_ears] could not save utterance: " + ex);
        }
    }

    private static String nameOf(UUID who) {
        ClientPacketListener conn = Minecraft.getInstance().getConnection();
        PlayerInfo info = conn == null ? null : conn.getPlayerInfo(who);
        return info == null ? who.toString() : info.getProfile().getName();
    }

    private static byte[] wav(byte[] pcm) {
        int rate = RATE_IN / DOWNSAMPLE;
        ByteBuffer b = ByteBuffer.allocate(44 + pcm.length).order(ByteOrder.LITTLE_ENDIAN);
        b.put("RIFF".getBytes()).putInt(36 + pcm.length).put("WAVE".getBytes());
        b.put("fmt ".getBytes()).putInt(16).putShort((short) 1).putShort((short) 1).putInt(rate).putInt(rate * 2)
                .putShort((short) 2).putShort((short) 16);
        b.put("data".getBytes()).putInt(pcm.length).put(pcm);
        return b.array();
    }
}
