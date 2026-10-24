// Lines the dug basement like a player would: a cobblestone floor (y 64), cobblestone walls (y 65-67) with dark oak
// pillars in the four corners, and the mine stairs in the east wall (74, 65-66, 702) left open. Each dirt block is dug
// out and the new block placed against whatever is behind it.
// Usage: node line_basement.mjs
const X0 = 67, X1 = 73, Z0 = 700, Z1 = 704;

async function call(tool, args = {}, target) {
  const res = await (await fetch("http://127.0.0.1:25601", { method: "POST", body: JSON.stringify({ tool, args, target }) })).json();
  const text = res.content?.[0]?.text ?? "";
  try { return JSON.parse(text); } catch { return text; }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const block = async (x, y, z) => (await call("get_block", { x, y, z }, "host"))?.id ?? "?";
const isAir = id => id === "minecraft:air" || id === "minecraft:cave_air" || id.includes("water");
const SOFT = ["dirt", "grass_block", "coarse_dirt", "gravel", "sand", "clay", "rooted_dirt", "mud"];

async function hold(item) {
  const inv = await call("get_inventory");
  const slot = inv.hotbar.find(i => i.id === item)?.slot;
  if (slot !== undefined) { await call("select_hotbar_slot", { slot }); return true; }
  const main = inv.main.find(i => i.id === item);
  if (!main) return false;
  await call("swap_slots", { slotA: main.slot, slotB: 7 });
  await call("select_hotbar_slot", { slot: 7 });
  return true;
}

async function standable([x, y, z]) {
  return isAir(await block(x, y, z)) && isAir(await block(x, y + 1, z)) && !isAir(await block(x, y - 1, z));
}

async function walkTo(x, z) {
  for (let i = 0; i < 40; i++) {
    const me = await call("get_self");
    if (Math.hypot(me.x - (x + 0.5), me.z - (z + 0.5)) < 0.3) break;
    await call("look_at", { x: x + 0.5, y: me.y + 1.62, z: z + 0.5 });
    await call("set_movement", { forward: true });
    await sleep(100);
  }
  await call("stop_movement");
  await sleep(300);
}

// Stand inside the room within reach, on solid floor.
async function near(x, y, z) {
  let me = await call("get_self");
  // Fell through a floor hole into the cave below: get back up on the floor before doing anything else.
  if (me.y < 64.9) { await call("run_command", { command: "tp claude 70.5 65 703.5" }, "host"); await sleep(500); me = await call("get_self"); }
  if (Math.hypot(me.x - (x + 0.5), me.y + 1.62 - (y + 0.5), me.z - (z + 0.5)) <= 3.0) return;
  const spots = [];
  for (let sx = X0; sx <= X1; sx++) for (let sz = Z0; sz <= Z1; sz++) spots.push([sx, 65, sz]);
  spots.sort((a, b) => Math.hypot(a[0] - x, a[2] - z) - Math.hypot(b[0] - x, b[2] - z));
  for (const s of spots) if (Math.hypot(s[0] - x, s[2] - z) >= 1 && await standable(s)) return walkTo(s[0], s[2]);
}

async function dig(x, y, z) {
  const id = await block(x, y, z);
  if (isAir(id)) return;
  await hold(SOFT.includes(id.split(":")[1]) ? "minecraft:diamond_shovel" : "minecraft:diamond_pickaxe");
  await call("look_at", { x: x + 0.5, y: y + 0.5, z: z + 0.5 });
  await call("break_block", { x, y, z, mode: "survival" });
  for (let i = 0; i < 40; i++) { await sleep(150); if (isAir(await block(x, y, z))) return; }
}

const FACE = { "1,0,0": "west", "-1,0,0": "east", "0,1,0": "down", "0,-1,0": "up", "0,0,1": "north", "0,0,-1": "south" };
async function set(x, y, z, item, prefer, holesOnly) {
  const id = await block(x, y, z);
  if (id === item) return "ok";
  if (holesOnly && !isAir(id)) return "later";
  await near(x, y, z);
  await dig(x, y, z);
  if (!(await hold(item))) return "out of " + item;
  // Place against the block behind the wall / under the floor first, otherwise any solid neighbour.
  const dirs = [prefer, [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0]].filter(Boolean);
  for (const [dx, dy, dz] of dirs) {
    const n = [x + dx, y + dy, z + dz];
    if (isAir(await block(...n))) continue;
    await call("look_at", { x: x + 0.5 + dx * 0.5, y: y + 0.5 + dy * 0.5, z: z + 0.5 + dz * 0.5 });
    await call("place_block", { x: n[0], y: n[1], z: n[2], face: FACE[[-dx, -dy, -dz].join(",")] });
    for (let i = 0; i < 10; i++) { await sleep(100); if ((await block(x, y, z)) === item) return "placed"; }
  }
  return "failed";
}

const STONE = "minecraft:cobblestone", WOOD = "minecraft:dark_oak_planks";
const jobs = [];
for (let x = X0; x <= X1; x++) for (let z = Z0; z <= Z1; z++) jobs.push([x, 64, z, STONE, [0, -1, 0]]);
for (let y = 65; y <= 67; y++) {
  for (let z = Z0; z <= Z1; z++) {
    jobs.push([X0 - 1, y, z, STONE, [-1, 0, 0]]);
    if (!(z === 702 && y <= 66)) jobs.push([X1 + 1, y, z, STONE, [1, 0, 0]]);
  }
  for (let x = X0; x <= X1; x++) {
    const corner = x === X0 || x === X1;
    jobs.push([x, y, Z0 - 1, corner ? WOOD : STONE, [0, 0, -1]]);
    jobs.push([x, y, Z1 + 1, corner ? WOOD : STONE, [0, 0, 1]]);
  }
}
// Floor holes first (nothing dug, so I never stand over a gap I made), several passes so each new block can hold the
// next; then everything else, digging dirt out and filling it straight back with stone.
for (let pass = 1; pass <= 6; pass++) {
  let placed = 0;
  for (const [x, y, z, item, prefer] of jobs.filter(j => j[1] === 64)) if ((await set(x, y, z, item, prefer, true)) === "placed") placed++;
  console.log(`floor holes pass ${pass}: ${placed} placed`);
  if (!placed) break;
}
let failed = 0;
for (const [x, y, z, item, prefer] of jobs) {
  const r = await set(x, y, z, item, prefer, false);
  if (r !== "ok" && r !== "placed") { failed++; console.log(x, y, z, item.split(":")[1], r); }
}
console.log(`done: ${jobs.length} blocks, ${failed} failed`);
