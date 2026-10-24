// Fills the cave pocket under the basement floor (y 63, x 67-73, z 700-704) with dirt, standing in the cave itself,
// so the floor above can never drop anyone into it again. Farthest cells first, so the ones near me stay open to
// look through; each is placed against the floor block above it, or failing that a solid side or the block below.
// Usage: node fill_cave.mjs
const X0 = 67, X1 = 73, Z0 = 700, Z1 = 704, Y = 63;

async function call(tool, args = {}, target) {
  const res = await (await fetch("http://127.0.0.1:25601", { method: "POST", body: JSON.stringify({ tool, args, target }) })).json();
  const t = res.content?.[0]?.text ?? ""; try { return JSON.parse(t); } catch { return t; }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const block = async (x, y, z) => (await call("get_block", { x, y, z }, "host"))?.id ?? "?";
const isAir = id => id === "minecraft:air" || id === "minecraft:cave_air" || id.includes("water");
const FACE = { "0,1,0": "down", "0,-1,0": "up", "1,0,0": "west", "-1,0,0": "east", "0,0,1": "north", "0,0,-1": "south" };

const inv = await call("get_inventory");
const dirt = inv.hotbar.find(i => i.id === "minecraft:dirt") ?? inv.main.find(i => i.id === "minecraft:dirt");
if (!dirt) throw new Error("no dirt");
if (dirt.slot > 8) { await call("swap_slots", { slotA: dirt.slot, slotB: 7 }); await call("select_hotbar_slot", { slot: 7 }); }
else await call("select_hotbar_slot", { slot: dirt.slot });

const me = await call("get_self");
const mx = Math.floor(me.x), mz = Math.floor(me.z);
const cells = [];
for (let x = X0; x <= X1; x++) for (let z = Z0; z <= Z1; z++) if (!(x === mx && z === mz)) cells.push([x, Y, z]);
cells.sort((a, b) => Math.hypot(b[0] - mx, b[2] - mz) - Math.hypot(a[0] - mx, a[2] - mz));

for (let pass = 1; pass <= 4; pass++) {
  let placed = 0, left = 0;
  for (const [x, y, z] of cells) {
    if (!isAir(await block(x, y, z))) continue;
    let ok = false;
    for (const [dx, dy, dz] of [[0, 1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, -1, 0]]) {
      const n = [x + dx, y + dy, z + dz];
      if (isAir(await block(...n))) continue;
      await call("look_at", { x: x + 0.5 + dx * 0.5, y: y + 0.5 + dy * 0.5, z: z + 0.5 + dz * 0.5 });
      await call("place_block", { x: n[0], y: n[1], z: n[2], face: FACE[[-dx, -dy, -dz].join(",")] });
      await sleep(250);
      if (!isAir(await block(x, y, z))) { ok = true; break; }
    }
    ok ? placed++ : left++;
  }
  console.log(`pass ${pass}: ${placed} placed, ${left} left`);
  if (!left) break;
}
