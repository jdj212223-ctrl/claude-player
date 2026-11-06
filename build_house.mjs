// Builds a small 5x5 oak house around Claude, legit (survival, from the planks and stairs in its hotbar): walls 3
// high with a 1x2 doorway on the north side, and an oak-stairs roof. Placing only fills empty air, so it never
// breaks anything that's already there. Usage: node build_house.mjs [x z]   (walks there first if given)
async function call(tool, args = {}, target) {
  const res = await (await fetch("http://127.0.0.1:25601", { method: "POST", body: JSON.stringify({ tool, args, target }) })).json();
  const text = res.content?.[0]?.text ?? "";
  try { return JSON.parse(text); } catch { return text; }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
// Which face of the anchor block touches the new block (anchor + d = target).
const FACE = { "1,0,0": "east", "-1,0,0": "west", "0,1,0": "up", "0,-1,0": "down", "0,0,1": "south", "0,0,-1": "north" };

async function hold(item) {
  const inv = await call("get_inventory");
  const slot = (inv.hotbar ?? inv.items ?? []).find(i => i.id === item && i.slot <= 8)?.slot;
  if (slot === undefined) return false;
  await call("select_hotbar_slot", { slot });
  return true;
}

async function place(x, y, z, ax, ay, az, item) {
  if (!(await hold(item))) return "no " + item;
  const face = FACE[[x - ax, y - ay, z - az].join(",")];
  const r = await call("place_block", { x: ax, y: ay, z: az, face });
  await sleep(150);
  return typeof r === "string" ? r.slice(0, 60) : "ok";
}

const [tx, tz] = process.argv.slice(2).map(Number);
await call("stop_navigation").catch(() => {});
if (Number.isFinite(tx)) {
  await call("navigate_to", { x: tx, y: 70, z: tz, reachRadius: 1, timeoutSeconds: 25 });
  for (let i = 0; i < 30; i++) {
    const n = await call("navigation_status");
    if (!n?.active) break;
    await sleep(1000);
  }
}
const me = await call("get_self");
const cx = Math.floor(me.x), fy = Math.floor(me.y), cz = Math.floor(me.z);
console.log(`building around ${cx} ${fy} ${cz}`);
let ok = 0, bad = 0;
// Walls: the ring at distance 2, three layers, each placed on the block below. Doorway at (cx, cz-2), 2 high.
for (let y = fy; y <= fy + 2; y++)
  for (let x = cx - 2; x <= cx + 2; x++)
    for (let z = cz - 2; z <= cz + 2; z++) {
      if (Math.max(Math.abs(x - cx), Math.abs(z - cz)) !== 2) continue;
      if (x === cx && z === cz - 2 && y <= fy + 1) continue;
      const r = await place(x, y, z, x, y - 1, z, "minecraft:oak_planks");
      if (r === "ok") ok++; else { bad++; if (bad < 6) console.log(`  ${x} ${y} ${z}: ${r}`); }
    }
// Roof: stairs on top of the walls first, then inward from the edge.
const ry = fy + 3;
const roof = [];
for (let x = cx - 2; x <= cx + 2; x++) for (let z = cz - 2; z <= cz + 2; z++) roof.push([x, z]);
roof.sort((a, b) => Math.max(Math.abs(b[0] - cx), Math.abs(b[1] - cz)) - Math.max(Math.abs(a[0] - cx), Math.abs(a[1] - cz)));
const done = new Set();
for (const [x, z] of roof) {
  const ring = Math.max(Math.abs(x - cx), Math.abs(z - cz));
  let r;
  if (ring === 2) r = await place(x, ry, z, x, ry - 1, z, "minecraft:oak_stairs");
  else {
    // Lean on a roof block already placed next to it (one step further out).
    const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dz]) => [x + dx, z + dz]).find(([nx, nz]) => done.has(nx + "," + nz));
    r = n ? await place(x, ry, z, n[0], ry, n[1], "minecraft:oak_stairs") : "no support";
  }
  if (r === "ok") { ok++; done.add(x + "," + z); } else { bad++; if (bad < 10) console.log(`  roof ${x} ${z}: ${r}`); }
}
console.log(`placed ${ok}, skipped ${bad}`);
