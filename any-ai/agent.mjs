// A small brain for the in-game player that works with any AI that speaks the OpenAI chat API with tool calling:
// Ollama (local), OpenAI, Mistral, OpenRouter, LM Studio and more. It starts ears.mjs, and every line ears prints
// (someone said the wake word in chat or voice) becomes one turn: the AI looks, acts with tools, and answers in game.
// Needs the player running (start.sh, or PLAYER=<name> ./start.sh for an AI with its own body). Settings come from environment variables, see README.md.
import { spawn, execFile } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { promisify } from "node:util";
import { DAEMON, MODE, NAME as PLAYER } from "../player.mjs";
const run = promisify(execFile);
const here = new URL(".", import.meta.url).pathname, root = here + "../";

const BASE = (process.env.AI_BASE_URL ?? "http://127.0.0.1:11434/v1").replace(/\/$/, "");
const MODEL = process.env.AI_MODEL ?? "qwen3:4b-instruct";
const KEY = process.env.AI_API_KEY ?? "";
const NAME = process.env.AI_NAME ?? PLAYER; // the in-game player's name (PLAYER=<name> picks which body)
const MAX_STEPS = 8, KEEP = 30; // tool rounds per wake-up, messages remembered between wake-ups
// The rules, then what the AI should know about this world (WORLD.md: places, people, mods; edit it as the world grows).
const read = file => { try { return readFileSync(here + file, "utf8"); } catch { return ""; } };
const SYSTEM = (read("PLAYBOOK.md") + "\n" + read("WORLD.md")).replaceAll("{name}", NAME);

async function mc(tool, args = {}, target = "me") {
  const res = await (await fetch(DAEMON, { method: "POST", body: JSON.stringify({ tool, args, target }) })).json();
  return (res.content ?? []).filter(c => c.type === "text").map(c => c.text).join("\n") || "(no output)";
}
const node = async (script, args = []) => (await run("node", [root + script, ...args], { cwd: root })).stdout.trim();

// The tools the AI gets. Few and simple, so small local models cope; "minecraft" reaches every other MCPFabric tool.
const fn = (name, description, properties = {}, required = []) =>
  ({ type: "function", function: { name, description, parameters: { type: "object", properties, required } } });
const str = description => ({ type: "string", description });
const num = description => ({ type: "number", description });
const TOOLS = [
  fn("say", "Say something to the players: shown in chat and spoken in voice chat. Keep it short.", { text: str("what to say") }, ["text"]),
  fn("status", "Look around: position, health, food, what is in hand, hotbar, what you look at, who is near."),
  fn("follow", "Start following a player around (runs by itself until stop).", { player: str("player name") }, ["player"]),
  fn("stop", "Stop following or walking, stay where you are."),
  fn("wear", "Put on armor (like the exoskeleton) or hold an item: give its hotbar slot number from status.",
    { slot: num("hotbar slot 0-8") }, ["slot"]),
  fn("go_to", "Walk to block coordinates.", { x: num("x"), y: num("y"), z: num("z") }, ["x", "y", "z"]),
  fn("minecraft", "Call any other MCPFabric tool by name, for example get_inventory, look_at, break_block, place_block, " +
    "use_item, attack_entity, craft_item, collect_blocks, find_blocks, get_recent_chat, job_status.",
    { tool: str("tool name"), args: str("arguments as a JSON object, e.g. {\"slot\": 2}") }, ["tool"]),
];

async function useTool(name, a) {
  switch (name) {
    case "say": return await node("talk.mjs", [String(a.text ?? "")]);
    case "status": return await node("status.mjs");
    case "follow": writeFileSync(MODE, `follow ${a.player}\n`); return `following ${a.player}`;
    case "stop": writeFileSync(MODE, "off\n"); await mc("stop_navigation"); return await mc("stop_movement");
    case "wear": {
      await mc("select_hotbar_slot", { slot: Number(a.slot) });
      const held = JSON.parse(await mc("get_equipment")).mainHand;
      // Armor goes on with a right click; anything else just stays in hand.
      if (/helmet|chestplate|leggings|boots|exoskeleton|elytra/.test(held?.id ?? "")) await mc("use_item");
      return await mc("get_equipment");
    }
    case "go_to": writeFileSync(MODE, "off\n"); return await mc("navigate_to", { x: a.x, y: a.y, z: a.z });
    case "minecraft": {
      let args = a.args ?? {};
      // Small models often send the arguments as text, sometimes with stray backslashes: {\"slot\": 2}.
      if (typeof args === "string") {
        try { args = args.trim() ? JSON.parse(args) : {}; } catch { args = JSON.parse(args.replace(/\\"/g, '"')); }
      }
      return await mc(String(a.tool), args);
    }
    default: return "unknown tool " + name;
  }
}

async function chat(messages) {
  const res = await fetch(BASE + "/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(KEY && { Authorization: "Bearer " + KEY }) },
    body: JSON.stringify({ model: MODEL, messages, tools: TOOLS }),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 300)}`);
  return (await res.json()).choices[0].message;
}

// Thinking models (Qwen 3, DeepSeek R1) may put their thoughts in <think> tags; players should not see those.
const clean = text => (text ?? "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();

let history = [];
async function turn(heard) {
  history.push({ role: "user", content: heard });
  let saidSomething = false;
  for (let step = 0; step < MAX_STEPS; step++) {
    const msg = await chat([{ role: "system", content: SYSTEM }, ...history]);
    history.push({ role: "assistant", content: msg.content ?? "", ...(msg.tool_calls?.length && { tool_calls: msg.tool_calls }) });
    if (!msg.tool_calls?.length) {
      // Some models answer in plain text instead of calling "say": say it for them.
      const text = clean(msg.content);
      if (text && !saidSomething) await useTool("say", { text });
      break;
    }
    for (const call of msg.tool_calls) {
      let out;
      try {
        const args = JSON.parse(call.function.arguments || "{}");
        console.log(`  → ${call.function.name} ${JSON.stringify(args)}`);
        out = await useTool(call.function.name, args);
        if (call.function.name === "say") saidSomething = true;
      } catch (e) { out = "ERROR " + e.message; }
      history.push({ role: "tool", tool_call_id: call.id, content: String(out).slice(0, 4000) });
    }
  }
  // Forget old messages, but never start the memory on a tool result that lost its tool call.
  if (history.length > KEEP) {
    history = history.slice(-KEEP);
    while (history.length && history[0].role !== "user") history.shift();
  }
}

// Wake-ups that arrive while the AI is busy wait their turn and are handled together.
const queue = [];
let busy = false;
async function pump() {
  if (busy || !queue.length) return;
  busy = true;
  const heard = queue.splice(0).join("\n");
  console.log(heard);
  try { await turn(heard); } catch (e) { console.log("  AI error: " + e.message); }
  busy = false;
  pump();
}

console.log(`${NAME} is listening, brain: ${MODEL} at ${BASE}`);
const ears = spawn("node", [root + "ears.mjs"], { cwd: root, stdio: ["ignore", "pipe", "inherit"] });
createInterface({ input: ears.stdout }).on("line", line => { queue.push(line); pump(); });
ears.on("exit", code => { console.log("ears stopped (" + code + ")"); process.exit(1); });
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(sig, () => { ears.kill(); process.exit(0); });
