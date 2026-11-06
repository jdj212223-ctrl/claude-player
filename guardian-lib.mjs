// Shared bits for the guardian (bot 3.0): how much memory the computer has free, which AI brains are running, what
// Ollama has loaded, and which local model fits in the memory there is. Works on macOS and Linux; on other systems the
// memory numbers come from Node's own (rougher) os.freemem().
import { execFile } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { freemem, totalmem, platform } from "node:os";
import { promisify } from "node:util";
const run = promisify(execFile);
export const ROOT = new URL(".", import.meta.url).pathname;
export const OLLAMA = "http://127.0.0.1:11434";
export const GB = 1024 ** 3;
export const gb = bytes => (bytes / GB).toFixed(1) + " GB";

export function config() {
  const defaults = { limitsGB: {}, lowMemoryGB: 2, claudeQuietSeconds: 90, claudeNoAnswerSeconds: 180, standIn: "auto" };
  try { return { ...defaults, ...JSON.parse(readFileSync(ROOT + "guardian.json", "utf8")) }; } catch { return defaults; }
}

// Memory the computer could hand out right now. macOS counts inactive and purgeable pages as free to reuse, so
// os.freemem() alone looks far too low there; vm_stat has the real picture.
export async function memory() {
  const total = totalmem();
  if (platform() === "darwin") {
    try {
      const { stdout } = await run("vm_stat");
      const page = Number(stdout.match(/page size of (\d+)/)?.[1] ?? 16384);
      const pages = name => Number(stdout.match(new RegExp(`Pages ${name}:\\s+(\\d+)`))?.[1] ?? 0);
      const free = (pages("free") + pages("inactive") + pages("speculative") + pages("purgeable")) * page;
      return { total, free };
    } catch {}
  }
  if (platform() === "linux") {
    try {
      const kb = Number(readFileSync("/proc/meminfo", "utf8").match(/MemAvailable:\s+(\d+)/)[1]);
      return { total, free: kb * 1024 };
    } catch {}
  }
  return { total, free: freemem() };
}

// Every process with how much memory it really uses (RSS). Read only: the guardian never kills by name.
export async function processes() {
  try {
    // Names can have spaces ("Google Chrome Helper"), so read the name and the full command line separately.
    const opts = { maxBuffer: 16 * 1024 * 1024 };
    const names = (await run("ps", ["-axo", "pid=,rss=,comm="], opts)).stdout;
    const cmds = new Map((await run("ps", ["-axo", "pid=,args="], opts)).stdout.split("\n")
      .map(l => l.trim().match(/^(\d+)\s+(.*)$/)).filter(Boolean).map(m => [Number(m[1]), m[2]]));
    return names.trim().split("\n").map(l => {
      const m = l.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/);
      return m && { pid: Number(m[1]), rss: Number(m[2]) * 1024, comm: m[3].split("/").pop(), args: cmds.get(Number(m[1])) ?? m[3] };
    }).filter(Boolean);
  } catch { return []; }
}
export const alive = pid => { if (!(pid > 0)) return false; try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; } };

// Other AI programs that might be on this computer, so the report can say who is using the memory.
// [pattern, name, also look in the command line?] Command lines are only searched for programs run by node or python
// (Codex, agent.mjs), otherwise every shell that mentions "claude" in a path would count.
const KNOWN_AI = [
  [/^ollama/i, "Ollama (local AI models)"], [/^LM Studio|^lms$/i, "LM Studio"], [/^llama-server/i, "llama.cpp"],
  [/any-ai\/agent\.mjs/, "AI player brain (agent.mjs)", true], [/\bcodex\b/i, "Codex", true],
  [/copilot/i, "GitHub Copilot"], [/^claude$|^Claude( Helper.*)?$/i, "Claude"], [/^whisper/i, "Whisper (speech to text)"],
];
export function aiProcesses(procs) {
  const out = [];
  for (const p of procs) {
    // The bot's own helper scripts live in claude-player/: only agent.mjs counts.
    if (p.args.includes(ROOT) && !/agent\.mjs/.test(p.args)) continue;
    const hit = KNOWN_AI.find(([re, , args]) => re.test(p.comm) || (args && /^(node|python)/.test(p.comm) && re.test(p.args)));
    if (hit && p.pid !== process.pid) out.push({ ...p, kind: hit[1] });
  }
  return out;
}

export async function ollamaUp() {
  try { return (await fetch(OLLAMA + "/api/version", { signal: AbortSignal.timeout(1500) })).ok; } catch { return false; }
}
// Models Ollama has in memory right now: [{ name, size }].
export async function ollamaLoaded() {
  try { return (await (await fetch(OLLAMA + "/api/ps", { signal: AbortSignal.timeout(3000) })).json()).models ?? []; } catch { return []; }
}
// Models installed on disk: [{ name, size }].
export async function ollamaInstalled() {
  try { return (await (await fetch(OLLAMA + "/api/tags", { signal: AbortSignal.timeout(3000) })).json()).models ?? []; } catch { return []; }
}
// Takes a model out of memory (it stays on disk). Returns how much memory that frees.
export async function ollamaUnload(name) {
  const size = (await ollamaLoaded()).find(m => m.name === name || m.model === name)?.size ?? 0;
  try {
    await fetch(OLLAMA + "/api/generate", { method: "POST", body: JSON.stringify({ model: name, keep_alive: 0 }), signal: AbortSignal.timeout(10000) });
  } catch {}
  return size;
}
// The biggest installed model that still fits: a model needs about its file size plus 20% (and a little room for its
// working memory), and the computer keeps 1.5 GB for everything else.
export async function pickModel(budget) {
  const fits = (await ollamaInstalled()).filter(m => m.size * 1.2 + 0.5 * GB <= budget).sort((a, b) => b.size - a.size);
  return fits[0]?.name ?? null;
}

// Each AI brain (agent.mjs) keeps a card in its game folder: run/brain.json or run-<name>/brain.json.
export function brainCards() {
  const cards = [];
  for (const d of readdirSync(ROOT)) {
    if (d !== "run" && !d.startsWith("run-")) continue;
    try { cards.push({ dir: ROOT + d + "/", ...JSON.parse(readFileSync(ROOT + d + "/brain.json", "utf8")) }); } catch {}
  }
  return cards;
}
export const playerDir = name => ROOT + (name === "claude" ? "run/" : `run-${name}/`);

// The .txt report for an AI's helper: one entry per thing that happened, newest at the bottom. agent.mjs reads it when it
// starts (and Claude reads run/guardian-report.txt when it wakes), then moves it to guardian-report.read.txt.
export function report(player, title, lines) {
  const dir = playerDir(player);
  if (!existsSync(dir)) return;
  const when = new Date().toLocaleString("en-GB");
  const text = `\n=== ${title} (${when}) ===\n` + lines.map(l => (l.startsWith(" ") ? l : "- " + l)).join("\n") + "\n";
  appendFileSync(dir + "guardian-report.txt", text);
  appendFileSync(ROOT + "guardian.log", `[${when}] ${player}: ${title}\n`);
}
export async function biggestApps(procs, n = 5) {
  return [...procs].sort((a, b) => b.rss - a.rss).slice(0, n).map(p => `  ${p.comm} (PID ${p.pid}): ${gb(p.rss)}`);
}
// A little pop-up on the Mac so the user sees it too (no-op elsewhere).
export function notify(text) {
  if (platform() !== "darwin") return;
  run("osascript", ["-e", `display notification ${JSON.stringify(text)} with title "Bot guardian"`]).catch(() => {});
}
export function writeJson(file, data) { writeFileSync(file, JSON.stringify(data, null, 2)); }
