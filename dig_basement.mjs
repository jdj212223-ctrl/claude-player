// Digs a 7x5x3 basement under the house like a player would: a hatch through the floor at (70,68,700), a shaft down,
// then the room (x 67-73, z 700-704, y 65-67) cleared from the inside, nearest blocks first, with a shovel or pickaxe.
// Usage: node dig_basement.mjs
const X0 = 67, X1 = 73, Z0 = 700, Z1 = 704, Y0 = 65, Y1 = 67, HATCH = [70, 68, 700];

async function call(tool, args = {}, target) {
  const res = await (await fetch("http://127.0.0.1:25601", { method: "POST", body: JSON.stringify({ tool, args, target }) })).json();
  const text = res.content?.[0]?.text ?? "";
  try { return JSON.parse(text); } catch { return text; }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const block = async (x, y, z) => (await call("get_block", { x, y, z }, "host"))?.id ?? "?";
const isAir = id => id === "minecraft:air" || id === "minecraft:cave_air";
const SOFT = ["dirt", "grass_block", "coarse_dirt", "gravel", "sand", "clay", "rooted_dirt", "mud"];

async function hold(item) {
  const inv = await call("get_inventory");
  const slot = inv.hotbar.find(i => i.id === item)?.slot;
  if (slot !== undefined) return call("select_hotbar_slot", { slot });
  const main = inv.main.find(i => i.id === item);
  if (main) { await call("swap_slots", { slotA: main.slot, slotB: 7 }); await call("select_hotbar_slot", { slot: 7 }); }
}

// A spot is somewhere to stand: two air blocks on solid ground.
async function standable([x, y, z]) {
  return isAir(await block(x, y, z)) && isAir(await block(x, y + 1, z)) && !isAir(await block(x, y - 1, z));
}

// Short hops inside the house and the pit: steer straight at the spot, since the pathfinder finds no path in tight rooms.
async function walkTo([x, y, z]) {
  for (let i = 0; i < 40; i++) {
    const me = await call("get_self");
    if (Math.hypot(me.x - (x + 0.5), me.z - (z + 0.5)) < 0.3) break;
    await call("look_at", { x: x + 0.5, y: me.y + 1.62, z: z + 0.5 });
    await call("set_movement", { forward: true });
    await sleep(100);
  }
  await call("stop_movement");
  await sleep(300);
  const me = await call("get_self");
  if (Math.hypot(me.x - (x + 0.5), me.z - (z + 0.5)) > 0.8) throw new Error(`can't walk to ${x} ${y} ${z}, stuck at ${me.x.toFixed(1)} ${me.y} ${me.z.toFixed(1)}`);
}

async function near(x, y, z) {
  const me = await call("get_self");
  if (Math.hypot(me.x - (x + 0.5), me.y + 1.62 - (y + 0.5), me.z - (z + 0.5)) <= 4.2) return;
  const spots = [];
  for (let sx = X0; sx <= X1; sx++) for (let sz = Z0; sz <= Z1; sz++) spots.push([sx, Y0, sz]);
  spots.sort((a, b) => Math.hypot(a[0] - x, a[2] - z) - Math.hypot(b[0] - x, b[2] - z));
  for (const s of spots) if (await standable(s)) return walkTo(s);
}

async function mine(x, y, z) {
  const id = await block(x, y, z);
  if (isAir(id)) return "air";
  await hold(SOFT.includes(id.split(":")[1]) ? "minecraft:diamond_shovel" : "minecraft:diamond_pickaxe");
  await near(x, y, z);
  await call("look_at", { x: x + 0.5, y: y + 0.5, z: z + 0.5 });
  await call("break_block", { x, y, z, mode: "survival" });
  for (let i = 0; i < 40; i++) { await sleep(150); if (isAir(await block(x, y, z))) return "mined " + id; }
  return "stuck on " + id;
}

// 1. The hatch and the top of the shaft, from the house floor.
await walkTo([70, 69, 701]);
for (const y of [68, 67, 66]) console.log(`${HATCH[0]} ${y} ${HATCH[2]}:`, await mine(HATCH[0], y, HATCH[2]));
// 2. Drop in, then dig out the last block under my feet.
await walkTo([70, 66, 700]);
await sleep(800);
console.log("70 65 700:", await mine(70, 65, 700));
await sleep(800);

// 3. The room, nearest first, top to bottom per column; repeat passes for anything that was out of sight.
const todo = [];
for (let x = X0; x <= X1; x++) for (let z = Z0; z <= Z1; z++) for (let y = Y1; y >= Y0; y--) todo.push([x, y, z]);
const key = ([x, y, z]) => Math.hypot(x - 70, z - 700) * 10 + (Y1 - y);
todo.sort((a, b) => key(a) - key(b));
for (let pass = 1; pass <= 3; pass++) {
  let left = 0;
  for (const p of todo) {
    const r = await mine(...p);
    if (r.startsWith("stuck")) { left++; console.log(p.join(" "), r); }
  }
  console.log(`pass ${pass}: ${left} left`);
  if (!left) break;
}
console.log("done");
