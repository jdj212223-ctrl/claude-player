// Claude says something: shown in everyone's chat as [claude] text (sent through the host world with tellraw, so the
// host's game does not hide it as "Not Secure"), and spoken out loud on this Mac. Usage: node talk.mjs "text"
import { execFile } from "node:child_process";
const text = process.argv.slice(2).join(" ").trim();
if (!text) process.exit(0);

async function call(tool, args, target) {
  const res = await (await fetch("http://127.0.0.1:25601", { method: "POST", body: JSON.stringify({ tool, args, target }) })).json();
  return res.content?.[0]?.text ?? "";
}

// "[claude]" rather than "<claude>": the host's game hides lines shaped like "<name> ..." from players it has hidden.
const line = ["", { text: "[claude] ", color: "#D97757" }, { text }];
let shown = await call("run_command", { command: "tellraw @a " + JSON.stringify(line) }, "host").catch(e => "ERROR " + e.message);
// No host bridge (or no permission): fall back to normal chat from Claude's own client.
if (!/"success":\s*true/.test(shown)) shown = await call("send_chat", { message: text }, "me").catch(() => "");
execFile("say", ["-v", "Daniel", text], () => {});
console.log(/"success":\s*true/.test(shown) ? "said (tellraw)" : "said (chat)");
