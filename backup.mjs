// Claude's backup brain: while Claude's own ears (ears.mjs under Claude's Monitor) have been silent for over 90 s,
// because its usage ran out or the Claude app is closed, this runs any-ai/agent.mjs as the claude player with a local
// model and the CLAUDE-BACKUP.md persona, so "claude ..." in chat still gets an answer. When Claude's ears come back,
// the stand-in stops. Run it next to start.sh: node backup.mjs (it never exits on its own).
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { RUN } from "./player.mjs";
const dir = new URL(".", import.meta.url).pathname;
const claudeAway = () => { try { return Date.now() - Number(readFileSync(RUN + "ears.alive", "utf8")) > 90000; } catch { return true; } };
// The local model lives on the external SSD; start Ollama's server pointed there if it isn't running.
async function ensureOllama() {
  try { await fetch("http://127.0.0.1:11434/api/version"); return; } catch {}
  spawn("ollama", ["serve"], { detached: true, stdio: "ignore", env: { ...process.env, OLLAMA_MODELS: "/Volumes/important/ollama-models" } }).unref();
  await new Promise(r => setTimeout(r, 4000));
}
let brain = null;
for (;;) {
  if (claudeAway() && !brain) {
    console.log(new Date().toLocaleTimeString(), "Claude is away: backup brain on");
    await ensureOllama();
    brain = spawn("node", [dir + "any-ai/agent.mjs"], {
      cwd: dir, stdio: "inherit",
      env: { ...process.env, PLAYER: "claude", AI_PERSONA: "CLAUDE-BACKUP.md", EARS_ALIVE: "backup.alive" },
    });
    brain.on("exit", () => { brain = null; });
  } else if (!claudeAway() && brain) {
    console.log(new Date().toLocaleTimeString(), "Claude is back: backup brain off");
    brain.kill();
    brain = null;
  }
  await new Promise(r => setTimeout(r, 10000));
}
