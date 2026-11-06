// Autopilot (bot 3.0): a brain with no AI in it, so it needs almost no memory and no usage. The guardian starts it when
// a player's real brain is gone (Claude hit its usage limit, or a local AI ran out of memory or crashed). It keeps the
// player alive and useful: buddy.mjs already drinks, sleeps, warms up and respawns; this answers simple chat commands.
// Usage: PLAYER=<name> AUTOPILOT_REASON="why" node autopilot.mjs
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { DAEMON, MODE, NAME } from "./player.mjs";
const dir = new URL(".", import.meta.url).pathname;
const REASON = process.env.AUTOPILOT_REASON ?? "my brain is taking a break";
const env = { ...process.env, BOT_STANDIN: "1", EARS_ALIVE: "autopilot.alive" };

async function call(tool, args = {}) {
  const res = await (await fetch(DAEMON, { method: "POST", body: JSON.stringify({ tool, args }) })).json();
  const text = res.content?.[0]?.text ?? "";
  try { return JSON.parse(text); } catch { return text; }
}
const say = text => new Promise(r => spawn("node", [dir + "talk.mjs", text], { stdio: "ignore", env }).on("exit", r));
let lastHelp = 0;

// What ears prints: "💬 <jdj125> claude follow me", "💬 jdj125: ..." or "🎙️ jdj125: claude stop".
function parse(line) {
  const m = line.match(/^\S+\s+<([^>]+)>\s*(.*)$/) ?? line.match(/^\S+\s+([^:\s]+):\s*(.*)$/);
  return m ? { who: m[1], text: m[2].toLowerCase() } : { who: null, text: line.toLowerCase() };
}

const COMMANDS = [
  [/\b(stop|stay|wait|halt|freeze)\b/, async () => {
    writeFileSync(MODE, "off\n");
    await call("stop_navigation").catch(() => {});
    await call("stop_movement").catch(() => {});
    return "ok, staying right here ✋";
  }],
  [/\b(follow|come( here)?|with me|let'?s go)\b/, async who => {
    if (!who) return "follow who? 🤔";
    writeFileSync(MODE, `follow ${who}\n`);
    return `following you, ${who} 🚶`;
  }],
  [/\b(how are you|status|health|hp|you ok|are you ok)\b/, async () => {
    const me = await call("get_self").catch(() => null);
    if (!me?.health) return "can't check myself right now 😵";
    return `❤️ ${Math.round(me.health)}/20 health, 🍗 ${me.food ?? "?"}/20 food, at ${Math.round(me.x)} ${Math.round(me.y)} ${Math.round(me.z)}`;
  }],
  [/\b(where|coords|position)\b/, async () => {
    const me = await call("get_self").catch(() => null);
    return me?.x != null ? `I'm at ${Math.round(me.x)} ${Math.round(me.y)} ${Math.round(me.z)} 📍` : "not sure where I am 😅";
  }],
  [/\b(why|what happened|autopilot|brain)\b/, async () => `🤖 autopilot: ${REASON}. My full brain comes back soon!`],
  [/\b(hi|hello|hey|yo|sup)\b/, async who => `hey${who ? " " + who : ""}! 👋 (autopilot mode)`],
  [/\b(thanks|thank you|thx|good job|gg)\b/, async () => "anytime! 😊"],
];

async function handle(line) {
  const { who, text } = parse(line);
  for (const [re, act] of COMMANDS) if (re.test(text)) return say(await act(who));
  // Something it doesn't understand: explain once a minute, stay quiet otherwise.
  if (Date.now() - lastHelp > 60000) {
    lastHelp = Date.now();
    return say("🤖 autopilot: I only know follow, stop, status, where. My full brain is back soon!");
  }
}

console.log(`${NAME} autopilot on: ${REASON}`);
await say(`⚙️ autopilot on: ${REASON}. I can still follow, stop, and stay alive 💪`);
const ears = spawn("node", [dir + "ears.mjs"], { cwd: dir, env, stdio: ["ignore", "pipe", "inherit"] });
let busy = Promise.resolve();
createInterface({ input: ears.stdout }).on("line", line => { busy = busy.then(() => handle(line)).catch(() => {}); });
ears.on("exit", () => process.exit(1));
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(sig, () => { ears.kill(); process.exit(0); });
