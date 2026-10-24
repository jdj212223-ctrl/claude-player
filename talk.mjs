// Claude says something: shown in everyone's chat as [claude] text (sent through the host world with tellraw, so the
// host's game does not hide it as "Not Secure"), and spoken in voice chat (queued in run/voice.txt for the mod's
// Mouth, which speaks it with macOS `say` into this client's voice chat audio). Usage: node talk.mjs "text"
import { appendFileSync } from "node:fs";
import { DAEMON, NAME, RUN } from "./player.mjs";
const dir = new URL(".", import.meta.url).pathname;
const text = process.argv.slice(2).join(" ").trim();
if (!text) process.exit(0);

async function call(tool, args, target) {
  const res = await (await fetch(DAEMON, { method: "POST", body: JSON.stringify({ tool, args, target }) })).json();
  return res.content?.[0]?.text ?? "";
}

// "[claude]" rather than "<claude>": the host's game hides lines shaped like "<name> ..." from players it has hidden.
// TALK_LABEL changes the name in brackets, e.g. to show which AI is talking.
const line = ["", { text: `[${process.env.TALK_LABEL ?? NAME}] `, color: "#D97757" }, { text }];
let shown = await call("run_command", { command: "tellraw @a " + JSON.stringify(line) }, "host").catch(e => "ERROR " + e.message);
// No host bridge (or no permission): fall back to normal chat from Claude's own client.
// Minecraft kicks a player for a chat message over 256 characters ("String too big"), so send long lines in pieces.
if (!/"success":\s*true/.test(shown)) {
  for (const piece of text.match(/.{1,256}(\s|$)|.{256}/g) ?? []) shown = await call("send_chat", { message: piece.trim() }, "me").catch(() => "");
}
appendFileSync(RUN + "voice.txt", text.replace(/\s+/g, " ") + "\n");
// Holding Simple Radio's transceiver: key it (hold "use") for as long as the line takes to say, so it goes out over
// the radio too. About 0.4 s a word at Daniel's pace, plus a second for the voice to be made.
const inv = JSON.parse((await call("get_inventory", {}, "me").catch(() => "{}")) || "{}");
const held = inv.hotbar?.find(i => i.slot === inv.selectedSlot)?.id;
if (held === "simpleradio:transceiver") {
  await call("start_using_item", {}, "me");
  await new Promise(r => setTimeout(r, 1000 + text.split(/\s+/).length * 400));
  await call("stop_using_item", {}, "me");
}
console.log(/"success":\s*true/.test(shown) ? "said (tellraw)" : "said (chat)");
