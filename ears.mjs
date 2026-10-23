// Prints one line whenever someone says something near Claude: voice chat (transcribed from run/ears/*.wav with
// whisper.cpp) or text chat (polled through daemon.mjs). Run it under Claude's Monitor so each line wakes Claude up.
import { readdirSync, readFileSync, unlinkSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const run = promisify(execFile);
const dir = new URL(".", import.meta.url).pathname;
const EARS = dir + "run/ears/", MODEL = dir + "models/ggml-base.en.bin";
// Whisper's usual guesses for noise and silence.
const NOISE = /^\s*(\[.*\]|\(.*\)|you|thank you\.?|thanks for watching!?|\.+)?\s*$/i;

async function call(tool, args = {}) {
  const res = await (await fetch("http://127.0.0.1:25601", { method: "POST", body: JSON.stringify({ tool, args }) })).json();
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
      if (m.type === "chat" && m.data?.sender !== "claude" && /claude/i.test(text)) wake(`💬 ${text}`);
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
      const { stdout } = await run("whisper-cli", ["-m", MODEL, "-f", EARS + f, "-nt", "-np"]);
      const text = stdout.replace(/\s+/g, " ").trim();
      if (!NOISE.test(text) && /\b(claude|cloud|clawed)\b/i.test(text)) wake(`🎙️ ${who}: ${text}`);
    } catch { /* bad clip */ }
    try { unlinkSync(EARS + f); } catch {}
  }
}

for (;;) {
  await pollChat();
  await transcribe();
  await new Promise(r => setTimeout(r, 700));
}
