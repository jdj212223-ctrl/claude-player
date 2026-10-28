// Prints one line whenever someone says something near Claude: voice chat (transcribed from run/ears/*.wav with
// whisper.cpp) or text chat (polled through daemon.mjs). Run it under Claude's Monitor so each line wakes Claude up,
// or let any-ai/agent.mjs start it for other AIs. WAKE="name|other" changes the wake word; EARS_VOICE=0 skips voice.
import { readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { DAEMON, NAME, RUN } from "./player.mjs";
const run = promisify(execFile);
const dir = new URL(".", import.meta.url).pathname;
const EARS = RUN + "ears/", MODEL = dir + "models/ggml-base.en.bin";
// Whisper's usual guesses for noise and silence.
// Words whisper should expect: names and mod words it otherwise mishears ("cloud" for Claude, "chrome flesh"...).
// Edit vocab.txt (one per line or comma-separated) to teach it more; it's re-read for every clip.
const DEFAULT_VOCAB = "Claude, jdj125, Minecraft, Backrooms, VoidClip, noclip, Level 0, Bacteria, Chromeflesh, cyberware, " +
  "HUDjack, exoskeleton, Nightvein, vampire, transceiver, Nether, netherite, obsidian, Deeper Dark, Warden, tavern, teleport";
const vocab = () => { try { return readFileSync(dir + "vocab.txt", "utf8").replace(/\s*\n\s*/g, ", ").trim(); } catch { return DEFAULT_VOCAB; } };
const NOISE = /^\s*(\[.*\]|\(.*\)|you|thank you\.?|thanks for watching!?|\.+)?\s*$/i;
// The wake word is the player's name (Claude also answers to whisper's "cloud" and "clawed") unless WAKE says otherwise.
const WAKE = new RegExp(`\\b(${process.env.WAKE ?? (NAME === "claude" ? "claude|cloud|clawed" : NAME)})\\b`, "i");
const CHAT_WAKE = process.env.WAKE || NAME !== "claude" ? WAKE : /claude/i;
const VOICE = process.env.EARS_VOICE !== "0";

async function call(tool, args = {}) {
  const res = await (await fetch(DAEMON, { method: "POST", body: JSON.stringify({ tool, args }) })).json();
  return res.content?.[0]?.text ?? "";
}

// LIMIT SAFER: while limit.mode says "on", Claude is not woken at all (usage is nearly used up), except by a message
// that names Claude and asks to turn it off ("claude limit safer off").
const limitSafer = () => { try { return readFileSync(dir + "limit.mode", "utf8").trim() === "on"; } catch { return false; } };
const wake = line => {
  if (limitSafer() && !/claude.*(limit safer off|wake up)/i.test(line)) return;
  console.log(line);
};

let lastChat = -1;
async function pollChat() {
  try {
    const { messages = [] } = JSON.parse(await call("get_recent_chat", { limit: 30 }));
    // Until the first non-empty read, everything is old news (the client keeps chat across reconnects).
    if (lastChat < 0) {
      if (messages.length) lastChat = Math.max(...messages.map(m => m.id));
      return;
    }
    for (const m of messages) {
      if (m.id <= lastChat) continue;
      const text = m.data?.text ?? "";
      // Only wake Claude when someone says its name (saves usage). Deaths no longer wake it: buddy.mjs respawns.
      if (m.type === "chat" && m.data?.sender !== NAME && CHAT_WAKE.test(text)) wake(`💬 ${text}`);
      lastChat = m.id;
    }
  } catch { /* client or daemon restarting */ }
}

async function transcribe() {
  let files = [];
  try { files = readdirSync(EARS).filter(f => f.endsWith(".wav")).sort(); } catch { return; }
  for (const f of files) {
    const who = f.replace(/^\d+_/, "").replace(/\.wav$/, "");
    try {
      const { stdout } = await run("whisper-cli", ["-m", MODEL, "-f", EARS + f, "-nt", "-np", "--prompt", vocab()]);
      const text = stdout.replace(/\s+/g, " ").trim();
      if (!NOISE.test(text) && WAKE.test(text)) wake(`🎙️ ${who}: ${text}`);
    } catch { /* bad clip */ }
    try { unlinkSync(EARS + f); } catch {}
  }
}

for (;;) {
  // Heartbeat for buddy.mjs's out-of-office reply and backup.mjs. The stand-in brain's ears write backup.alive instead,
  // so they never look like Claude's own.
  try { writeFileSync(RUN + (process.env.EARS_ALIVE ?? "ears.alive"), String(Date.now())); } catch {}
  await pollChat();
  if (VOICE) await transcribe();
  await new Promise(r => setTimeout(r, 700));
}
