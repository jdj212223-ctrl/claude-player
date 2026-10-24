// Stares at the nearest mob of a type near a player, so look-to-freeze monsters (Partygoers, Smilers) stay still
// while the player fights them. Usage: node watch.mjs <player> <entity type>   e.g. jdj125 voidclip:partygoer
const [who = "jdj125", type = "voidclip:partygoer"] = process.argv.slice(2);
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function call(tool, args = {}, target = "me") {
  const res = await (await fetch("http://127.0.0.1:25601", { method: "POST", body: JSON.stringify({ tool, args, target }) })).json();
  const text = res.content?.[0]?.text ?? "";
  try { return JSON.parse(text); } catch { return text; }
}
for (;;) {
  await sleep(250);
  try {
    const p = await call("get_player", { player: who }, "host");
    const me = await call("get_self");
    if (typeof p !== "object" || typeof me !== "object") continue;
    const found = await call("query_entities", { center: { x: me.x, y: me.y, z: me.z }, radius: 40, types: [type], dimension: me.dimension }, "host");
    const mob = (found?.entities ?? []).sort((a, b) => a.distance - b.distance)[0];
    if (mob) await call("look_at", { x: mob.x, y: mob.y + 1.6, z: mob.z });
    // Keep close to the player without walking into the fight.
    if (Math.hypot(me.x - p.x, me.z - p.z) > 8) await call("navigate_to", { x: p.x, y: p.y, z: p.z, reachRadius: 4, timeoutSeconds: 4 });
  } catch { await sleep(1000); }
}
