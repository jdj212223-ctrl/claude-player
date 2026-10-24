// Hunts every raider of a running raid, nearest first, wherever they are: the host's #raiders selector finds them
// (scans around a player miss raiders 60+ blocks away), then Claude's own client walks over and fights.
// Usage: node hunt_raid.mjs
async function call(tool, args = {}, target) {
  const res = await (await fetch("http://127.0.0.1:25601", { method: "POST", body: JSON.stringify({ tool, args, target }) })).json();
  const t = res.content?.[0]?.text ?? ""; try { return JSON.parse(t); } catch { return t; }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const sword = (await call("get_inventory")).hotbar.find(i => i.id.endsWith("_sword"));
if (sword) await call("select_hotbar_slot", { slot: sword.slot });
for (let round = 0; round < 400; round++) {
  const me = await call("get_self");
  // Tag the nearest raider to me, then read where it is.
  await call("run_command", { command: "tag @e remove hunt" }, "host");
  await call("run_command", { command: `execute positioned ${me.x} ${me.y} ${me.z} run tag @e[type=#minecraft:raiders,sort=nearest,limit=1] add hunt` }, "host");
  const r = await call("query_entities", { center: { x: me.x, y: me.y, z: me.z }, radius: 128, onlyLiving: true, includePlayers: false }, "host");
  const left = await call("run_command", { command: "execute if entity @e[type=#minecraft:raiders]" }, "host");
  if (!left?.resultValue) { console.log("no raiders left"); break; }
  const tagged = await call("run_command", { command: "data get entity @e[tag=hunt,limit=1] UUID" }, "host");
  const ints = (tagged?.output?.[0] ?? "").match(/-?\d+/g)?.slice(-4).map(Number);
  if (!ints) { await sleep(500); continue; }
  const hex = ints.map(n => (n >>> 0).toString(16).padStart(8, "0")).join("");
  const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  const f = (r?.entities ?? []).find(e => e.uuid === uuid) ?? await call("get_entity", { uuid }, "host");
  if (typeof f !== "object" || f.x === undefined) { await sleep(500); continue; }
  const d = Math.hypot(me.x - f.x, me.z - f.z);
  if (d > 40) { await call("run_command", { command: `tp claude ${f.x} ${f.y} ${f.z}` }, "host"); console.log(`ran to ${f.type}`); await sleep(500); continue; }
  if (d > 2.8) { await call("navigate_to", { x: f.x, y: f.y, z: f.z, reachRadius: 2, sprint: true, timeoutSeconds: 4 }); await sleep(400); continue; }
  await call("look_at", { x: f.x, y: f.y + 1.2, z: f.z });
  const a = await call("attack_entity", { uuid });
  if (a?.ok) console.log(`hit ${f.type.split(":")[1]} (${Math.round(f.health ?? 0)} hp)`);
  await sleep(600);
}
await call("run_command", { command: "tag @e remove hunt" }, "host");
