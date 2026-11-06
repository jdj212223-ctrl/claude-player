// The guardian (bot 3.0). One per computer, started by start.sh. Every 10 seconds it:
//  1. Looks for AI brains (agent.mjs cards in run*/brain.json) and other AI programs (Ollama, LM Studio, Codex...).
//  2. Keeps memory healthy: when the computer runs low it takes idle Ollama models out of memory, and starts Ollama
//     itself with memory-saving settings (one model at a time, smaller working memory).
//  3. Enforces memory limits from guardian.json ("limitsGB": { "ollama": 6 }): a brain that goes over is stopped
//     before it can freeze the computer.
//  4. Takes over a player whose brain is gone (over its limit, out of memory, crashed) with autopilot.mjs, so the
//     player keeps following, drinking, sleeping and answering simple commands.
//  5. For Claude: when Claude hits its usage limit (5-hour or weekly: LIMIT SAFER is on), its ears are off, or it
//     stopped answering, a stand-in plays as claude: a local Ollama model if one fits in memory, else autopilot.
// Each time, it writes what happened to that AI's helper as a .txt: run/guardian-report.txt (Claude) or
// run-<name>/guardian-report.txt (agent.mjs reads it when it starts). Nothing is ever killed by name, only by PID,
// and only the brains and helpers this bot started. It never changes system settings.
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import {
  ROOT, GB, gb, config, memory, processes, alive, aiProcesses, ollamaUp, ollamaLoaded, ollamaUnload,
  pickModel, brainCards, playerDir, report, biggestApps, notify, writeJson,
} from "./guardian-lib.mjs";

const stamp = () => new Date().toLocaleTimeString("en-GB");
const log = (...a) => console.log(stamp(), ...a);
const readNum = file => { try { return Number(readFileSync(file, "utf8")) || 0; } catch { return 0; } };
const RUN = playerDir("claude");
const OLLAMA_MODELS = "/Volumes/important/ollama-models";

// Only one guardian per computer.
const PIDFILE = ROOT + "guardian.pid";
if (alive(readNum(PIDFILE)) && readNum(PIDFILE) !== process.pid) { console.log("guardian already running"); process.exit(0); }
writeJson(PIDFILE, process.pid);

const autopilots = new Map(); // player -> child process
const handled = new Set();    // brain PIDs already dealt with
let standIn = null;           // Claude's stand-in: { kind, proc, since, reason }
let lastLowMemory = 0, startedOllama = null;

function startAutopilot(player, reason) {
  if (autopilots.has(player)) return;
  log(`${player}: autopilot on (${reason})`);
  const proc = spawn("node", [ROOT + "autopilot.mjs"], {
    cwd: ROOT, stdio: "inherit", env: { ...process.env, PLAYER: player, AUTOPILOT_REASON: reason },
  });
  autopilots.set(player, proc);
  proc.on("exit", () => autopilots.get(player) === proc && autopilots.delete(player));
}
function stopAutopilot(player, why) {
  const proc = autopilots.get(player);
  if (!proc) return;
  log(`${player}: autopilot off (${why})`);
  autopilots.delete(player);
  proc.kill();
}

// Starts Ollama pointed at the SSD with settings that use less memory: one model and one chat at a time, a smaller
// (8-bit) working memory, and models leave memory 2 minutes after the last use.
async function ensureOllama() {
  if (await ollamaUp()) return true;
  if (!existsSync(OLLAMA_MODELS)) return false;
  try {
    startedOllama = spawn("ollama", ["serve"], {
      detached: true, stdio: "ignore",
      env: {
        ...process.env, OLLAMA_MODELS, OLLAMA_KEEP_ALIVE: "2m", OLLAMA_MAX_LOADED_MODELS: "1", OLLAMA_NUM_PARALLEL: "1",
        OLLAMA_FLASH_ATTENTION: "1", OLLAMA_KV_CACHE_TYPE: "q8_0",
      },
    });
    startedOllama.on("error", () => {});
    startedOllama.unref();
  } catch { return false; }
  for (let i = 0; i < 10; i++) { await new Promise(r => setTimeout(r, 1000)); if (await ollamaUp()) return true; }
  return false;
}

// Is a player's game (its body) running? Its daemon answers on the port player.mjs works out.
async function bodyUp(player) {
  let port = 25601;
  try { port = JSON.parse(readFileSync(playerDir(player) + "config/mcpfabric.config.json", "utf8")).port + 1; } catch {}
  try { await fetch(`http://127.0.0.1:${port}`, { method: "POST", body: "{}", signal: AbortSignal.timeout(1500) }); return true; }
  catch { return false; }
}

// --- brains: limits, crashes, out of memory -------------------------------------------------------------------------
async function checkBrains(cfg, procs, loaded, mem) {
  for (const card of brainCards()) {
    const { player, pid } = card;
    if (!player || !pid) continue;
    const live = alive(pid) && procs.some(p => p.pid === pid && /agent\.mjs/.test(p.args));
    // A real brain is back for this player (someone restarted it): autopilot can stop.
    if (live && card.state === "running" && !card.standIn && autopilots.has(player)) stopAutopilot(player, "brain is back");
    if (handled.has(pid)) continue;

    let reason = null, lines = [];
    if (card.state === "out-of-memory") {
      reason = "my AI ran out of memory";
      lines = [`The AI model ${card.model} could not get enough memory and stopped.`, `Its error: ${card.error ?? "out of memory"}`];
    } else if (card.state === "running" && !live) {
      reason = "my AI brain crashed";
      lines = [`The brain (agent.mjs, PID ${pid}, model ${card.model}) stopped without saying goodbye: it crashed.`];
    } else if (card.state === "running" && live) {
      const limit = cfg.limitsGB?.[player];
      if (!limit) continue;
      const own = procs.find(p => p.pid === pid)?.rss ?? 0;
      const model = card.local ? loaded.find(m => m.name === card.model || m.model === card.model)?.size ?? 0 : 0;
      const used = own + model;
      if (used <= limit * GB) continue;
      reason = `my AI went over its ${limit} GB memory limit`;
      lines = [`${player}'s brain was using ${gb(used)} (agent ${gb(own)} + model ${gb(model)}), but its limit is ${limit} GB.`,
        "I stopped it before it could slow down or freeze the computer."];
      try { process.kill(pid, "SIGTERM"); lines.push(`Stopped the brain (agent.mjs, PID ${pid}).`); } catch {}
    } else continue;

    handled.add(pid);
    if (card.local && card.model) {
      const freed = await ollamaUnload(card.model);
      if (freed) lines.push(`Took the model ${card.model} out of memory (freed ${gb(freed)}).`);
    }
    try { writeJson(card.dir + "brain.json", { ...card, dir: undefined, state: "handled-by-guardian" }); } catch {}
    if (player === "claude" && card.standIn) {
      // Claude's Ollama stand-in failed: autopilot takes its place until Claude is back.
      standIn = null;
      lines.push("Switched the claude player to autopilot until Claude is back.");
      startClaudeAutopilot(reason);
    } else {
      lines.push(`Turned on autopilot for ${player}: it keeps following, drinking, sleeping and answers follow/stop/status.`);
      startAutopilot(player, reason);
    }
    lines.push(`Computer memory now: ${gb(mem.free)} free of ${gb(mem.total)}.`, "Biggest programs right now:", ...(await biggestApps(procs)));
    lines.push(`To bring the brain back: PLAYER=${player} node any-ai/agent.mjs   (autopilot stops by itself when it starts)`);
    report(player, `Guardian took over ${player}: ${reason}`, lines);
    notify(`${player}: ${reason}. Autopilot is playing for now.`);
  }
}

// --- the computer is low on memory: free what nobody is using -------------------------------------------------------
async function checkMemory(cfg, procs, loaded, mem) {
  if (mem.free >= cfg.lowMemoryGB * GB || Date.now() - lastLowMemory < 120000) return;
  lastLowMemory = Date.now();
  const cards = brainCards();
  const freedLines = [];
  for (const m of loaded) {
    const users = cards.filter(c => c.local && (c.model === m.name || c.model === m.model) && c.state === "running" && alive(c.pid));
    // A model is busy if a brain is thinking with it or used it in the last minute; leave those alone.
    if (users.some(c => c.busy || Date.now() - (c.lastTurn ?? 0) < 60000)) continue;
    const freed = await ollamaUnload(m.name);
    if (freed) freedLines.push(`Took the idle model ${m.name} out of memory (freed ${gb(freed)}).`);
  }
  const others = aiProcesses(procs).filter(p => p.rss > 0.3 * GB).map(p => `  ${p.kind}: ${p.comm} (PID ${p.pid}) uses ${gb(p.rss)}`);
  const lines = [`Only ${gb(mem.free)} of ${gb(mem.total)} memory was free (warning level: ${cfg.lowMemoryGB} GB).`,
    ...(freedLines.length ? freedLines : ["No idle AI models to take out of memory."]),
    ...(others.length ? ["Other AI programs on this computer:", ...others] : []),
    "Biggest programs right now:", ...(await biggestApps(procs)),
    "Tip: closing browser tabs or a second Minecraft frees the most memory."];
  log(`low memory: ${gb(mem.free)} free, ${freedLines.length} model(s) unloaded`);
  // Every AI player on this computer hears about it (Claude only if its game is running).
  const players = new Set(cards.map(c => c.player).filter(Boolean));
  if (existsSync(RUN)) players.add("claude");
  for (const p of players) report(p, "Low memory on the computer", lines);
  if (freedLines.length) notify(`Low memory: freed ${freedLines.length} idle AI model(s).`);
}

// --- Claude: usage limit, ears off, or not answering ----------------------------------------------------------------
function claudeAway(cfg) {
  const now = Date.now();
  try { if (readFileSync(ROOT + "limit.mode", "utf8").trim() === "on") return "Claude hit its usage limit (LIMIT SAFER is on)"; } catch {}
  if (now - readNum(RUN + "ears.alive") > cfg.claudeQuietSeconds * 1000) return "Claude is away (its ears are off: the app is closed or the limit ran out)";
  // Ears woke Claude for something and Claude never answered: it's probably out of usage.
  const woke = readNum(RUN + "wake.last"), said = readNum(RUN + "said.alive");
  if (woke > said && now - woke > cfg.claudeNoAnswerSeconds * 1000) return "Claude stopped answering (probably out of usage)";
  return null;
}

function startClaudeAutopilot(reason) {
  startAutopilot("claude", reason);
  standIn = { kind: "autopilot", proc: autopilots.get("claude"), since: Date.now(), reason };
}

async function checkClaude(cfg, mem) {
  const away = claudeAway(cfg);
  if (away && !standIn) {
    if (!(await bodyUp("claude"))) return; // no claude in the world: nothing to stand in for
    const lines = [`Why: ${away}.`];
    let model = null;
    const budget = Math.min(mem.free - 1.5 * GB, (cfg.limitsGB?.claude ?? Infinity) * GB);
    if (cfg.standIn !== "autopilot" && (await ensureOllama())) model = await pickModel(budget);
    if (model) {
      log(`claude: stand-in brain on (${model}) — ${away}`);
      const proc = spawn("node", [ROOT + "any-ai/agent.mjs"], {
        cwd: ROOT, stdio: "inherit",
        env: { ...process.env, PLAYER: "claude", AI_MODEL: model, AI_PERSONA: "CLAUDE-BACKUP.md", EARS_ALIVE: "backup.alive", BOT_STANDIN: "1" },
      });
      standIn = { kind: "ollama", proc, since: Date.now(), reason: away };
      proc.on("exit", () => { if (standIn?.proc === proc) standIn = null; });
      lines.push(`A local AI (${model}) is playing as claude: it fits in the ${gb(mem.free)} of free memory.`);
    } else {
      startClaudeAutopilot(away);
      lines.push(cfg.standIn === "autopilot" ? "Autopilot is playing as claude (guardian.json says autopilot)."
        : `Autopilot is playing as claude: no local AI fits in the ${gb(mem.free)} of free memory (or Ollama isn't installed).`);
    }
    report("claude", "Claude is away, a stand-in took over", lines);
    notify(`Claude is away: ${standIn?.kind === "ollama" ? "a local AI" : "autopilot"} is playing as claude.`);
  } else if (!away && standIn) {
    const mins = Math.round((Date.now() - standIn.since) / 60000);
    log(`claude: back, stand-in (${standIn.kind}) off`);
    report("claude", "Claude is back, stand-in stopped", [
      `The ${standIn.kind === "ollama" ? "local AI stand-in" : "autopilot"} played for you for ${mins} min because: ${standIn.reason}.`,
      "Read guardian.log and buddy.log if you want the details. Say hi to jdj125!"]);
    if (standIn.kind === "autopilot") stopAutopilot("claude", "Claude is back");
    else standIn.proc.kill();
    standIn = null;
  }
}

// Stopping the guardian stops the autopilots and stand-in it started (its own children, by PID).
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(sig, () => {
  for (const proc of autopilots.values()) proc.kill();
  standIn?.proc?.kill();
  process.exit(0);
});
log(`guardian on (pid ${process.pid})`);
const ais = aiProcesses(await processes());
if (ais.length) log("AI programs found: " + [...new Set(ais.map(a => a.kind))].join(", "));
for (;;) {
  try {
    const cfg = config(), procs = await processes(), mem = await memory();
    const loaded = (await ollamaUp()) ? await ollamaLoaded() : [];
    await checkBrains(cfg, procs, loaded, mem);
    await checkMemory(cfg, procs, loaded, mem);
    await checkClaude(cfg, mem);
  } catch (e) { log("guardian error: " + e.message); }
  await new Promise(r => setTimeout(r, 10000));
}
