package dev.claude.ears;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.concurrent.ConcurrentLinkedQueue;

/**
 * Lets Claude talk in Simple Voice Chat. talk.mjs appends lines to voice.txt in the game folder; each is spoken with
 * macOS `say` straight to 48 kHz 16-bit mono PCM, cut into the 20 ms frames voice chat sends, and merged into this
 * client's outgoing audio by {@link EarsPlugin} one frame per tick of the voice chat mic thread.
 */
final class Mouth {
    private static final Path INBOX = Path.of("voice.txt"), WAV = Path.of("voice.wav");
    private static final int FRAME = 960;
    private static final String VOICE = "Daniel";

    private static final ConcurrentLinkedQueue<short[]> FRAMES = new ConcurrentLinkedQueue<>();

    private Mouth() {
    }

    /** Whether Claude still has speech queued, i.e. is talking right now. */
    static boolean speaking() {
        return !FRAMES.isEmpty();
    }

    /** The next 20 ms of speech, or null when Claude is quiet. */
    static short[] nextFrame() {
        return FRAMES.poll();
    }

    /** Called every 100 ms off the game thread: speaks whatever talk.mjs queued up. */
    static void poll() {
        if (!Files.exists(INBOX)) return;
        try {
            Path taken = Path.of("voice.speaking.txt");
            Files.move(INBOX, taken, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            for (String line : Files.readAllLines(taken)) {
                if (!line.isBlank()) speak(line.strip());
            }
            Files.delete(taken);
        } catch (IOException | InterruptedException e) {
            System.err.println("[claude_ears] could not speak: " + e);
        }
    }

    private static void speak(String text) throws IOException, InterruptedException {
        Process p = new ProcessBuilder("say", "-v", VOICE, "-o", WAV.toString(), "--data-format=LEI16@48000", text)
                .redirectErrorStream(true).start();
        if (p.waitFor() != 0 || !Files.exists(WAV)) return;
        short[] pcm = readPcm(Files.readAllBytes(WAV));
        for (int i = 0; i < pcm.length; i += FRAME) {
            FRAMES.add(Arrays.copyOfRange(pcm, i, i + FRAME));
        }
        // A beat of silence so back-to-back lines don't run together.
        for (int i = 0; i < 10; i++) FRAMES.add(new short[FRAME]);
    }

    /** The samples of a little-endian 16-bit mono WAV: everything in its "data" chunk. */
    private static short[] readPcm(byte[] wav) {
        ByteBuffer b = ByteBuffer.wrap(wav).order(ByteOrder.LITTLE_ENDIAN);
        int pos = 12;
        while (pos + 8 <= wav.length) {
            String id = new String(wav, pos, 4, java.nio.charset.StandardCharsets.US_ASCII);
            int size = b.getInt(pos + 4);
            if (id.equals("data")) {
                int n = Math.min(size, wav.length - pos - 8) / 2;
                short[] out = new short[n];
                b.position(pos + 8);
                b.asShortBuffer().get(out);
                return out;
            }
            pos += 8 + size + (size & 1);
        }
        return new short[0];
    }
}
