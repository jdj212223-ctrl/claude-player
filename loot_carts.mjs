// Empties chest minecarts by uuid: teleports Claude onto each cart (host command), opens it, takes everything,
// then teleports back to the player. Usage: node loot_carts.mjs <player> <uuid> [uuid...]
const [who, ...carts] = process.argv.slice(2);
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function call(tool, args = {}, target = "me") {
  const res = await (await fetch("http://127.0.0.1:25601", { method: "POST", body: JSON.stringify({ tool, args, target }) })).json();
  const text = res.content?.[0]?.text ?? "";
  try { return JSON.parse(text); } catch { return text; }
}
for (const uuid of carts) {
  const c = await call("get_entity", { uuid }, "host");
  if (typeof c !== "object") { console.log("gone", uuid.slice(0, 8)); continue; }
  await call("run_command", { command: `tp claude ${c.x} ${Math.floor(c.y)} ${c.z}` }, "host");
  await sleep(1200);
  await call("look_at", { x: c.x, y: c.y + 0.5, z: c.z });
  await call("use_entity", { uuid });
  await sleep(600);
  const took = await call("container_transfer", { direction: "take" });
  await call("close_container");
  console.log(`${Math.round(c.x)} ${Math.round(c.y)} ${Math.round(c.z)}: ${String(took).split("\n")[0]}`);
}
await call("run_command", { command: `tp claude ${who}` }, "host");
