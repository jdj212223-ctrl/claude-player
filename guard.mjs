// Guards a player who is away from the keyboard: stays next to them and fights hostile mobs that come close,
// using the host's entity list (sees through walls) and Claude's own client to walk and swing.
// Runs until stopped; costs no Claude usage. Usage: node guard.mjs [player]
const who = process.argv[2] ?? "jdj125";
const HOSTILE = /zombie|skeleton|creeper|spider|witch|drowned|husk|stray|pillager|vindicator|slime|phantom|silverfish|enderman|voidclip:/;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function call(tool, args = {}, target = "me") {
  const res = await (await fetch("http://127.0.0.1:25601", { method: "POST", body: JSON.stringify({ tool, args, target }) })).json();
  const text = res.content?.[0]?.text ?? "";
  try { return JSON.parse(text); } catch { return text; }
}
let kills = 0;
for (;;) {
  await sleep(500);
  try {
    const p = await call("get_player", { player: who }, "host");
    if (typeof p !== "object") continue;
    const near = await call("query_entities", { center: { x: p.x, y: p.y, z: p.z }, radius: 12, onlyLiving: true, includePlayers: false, dimension: p.dimension }, "host");
    const foes = (near?.entities ?? []).filter(e => HOSTILE.test(e.type)).sort((a, b) => a.distance - b.distance);
    const me = await call("get_self");
    // VoidClip can noclip Claude away mid-fight: if it ends up in another dimension or far off, go back to them.
    if (me.dimension !== p.dimension || Math.hypot(me.x - p.x, me.z - p.z) > 48) {
      await call("run_command", { command: `tp claude ${who}` }, "host");
      console.log("teleported back to " + who);
      continue;
    }
    if (foes.length) {
      const f = foes[0];
      const d = Math.hypot(me.x - f.x, me.z - f.z);
      if (d > 2.8) await call("navigate_to", { x: f.x, y: f.y, z: f.z, reachRadius: 2, sprint: true, timeoutSeconds: 4 });
      await call("look_at", { x: f.x, y: f.y + 1, z: f.z });
      const r = await call("attack_entity", { uuid: f.uuid });
      if (r?.ok) console.log(`hit ${f.type} near ${who}`);
      continue;
    }
    // Nothing hostile: stay within a few blocks of them.
    if (Math.hypot(me.x - p.x, me.z - p.z) > 4) await call("navigate_to", { x: p.x, y: p.y, z: p.z, reachRadius: 3, timeoutSeconds: 5 });
  } catch { await sleep(1000); }
}
