// Mines stone for the basement walls like a player would: a staircase down out of the basement's east wall at z 702,
// then a 2-high tunnel heading east through solid stone, until enough cobblestone is in the inventory.
// Usage: node mine_stone.mjs [cobblestone wanted, default 120]   (stairs from the basement, then east)
//        node mine_stone.mjs <wanted> <x> <stand y> <z> <dx> <dz>   (carry on from an existing tunnel spot)
const WANT = Number(process.argv[2] ?? 120), Z = 702, X_START = 74, STAND_BOTTOM = 60;
const RESUME = process.argv.length > 3 ? process.argv.slice(3).map(Number) : null;

async function call(tool, args = {}, target) {
  const res = await (await fetch("http://127.0.0.1:25601", { method: "POST", body: JSON.stringify({ tool, args, target }) })).json();
  const text = res.content?.[0]?.text ?? "";
  try { return JSON.parse(text); } catch { return text; }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const block = async (x, y, z) => (await call("get_block", { x, y, z }, "host"))?.id ?? "?";
const isAir = id => id === "minecraft:air" || id === "minecraft:cave_air";
const SOFT = ["dirt", "grass_block", "coarse_dirt", "gravel", "sand", "clay", "rooted_dirt", "mud"];
const count = async item => (await call("get_inventory")).main.concat((await call("get_inventory")).hotbar)
  .filter(i => i.id === item).reduce((n, i) => n + i.count, 0);

async function hold(item) {
  const inv = await call("get_inventory");
  const slot = inv.hotbar.find(i => i.id === item)?.slot;
  if (slot !== undefined) return call("select_hotbar_slot", { slot });
  const main = inv.main.find(i => i.id === item);
  if (main) { await call("swap_slots", { slotA: main.slot, slotB: 7 }); await call("select_hotbar_slot", { slot: 7 }); }
}

// Steer straight at a spot: the pathfinder finds no path in a 1-wide tunnel.
async function walkTo(x, z) {
  for (let i = 0; i < 40; i++) {
    const me = await call("get_self");
    if (Math.hypot(me.x - (x + 0.5), me.z - (z + 0.5)) < 0.3) break;
    await call("look_at", { x: x + 0.5, y: me.y + 1.62, z: z + 0.5 });
    await call("set_movement", { forward: true });
    await sleep(100);
  }
  await call("stop_movement");
  await sleep(400);
}

// Never open into lava or water.
async function safe(x, y, z) {
  for (const [dx, dy, dz] of [[1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
    const id = await block(x + dx, y + dy, z + dz);
    if (id.includes("lava") || id.includes("water")) return id;
  }
  return null;
}

async function mine(x, y, z) {
  const id = await block(x, y, z);
  if (isAir(id)) return;
  const danger = await safe(x, y, z);
  if (danger) throw new Error(`stopped: ${danger} next to ${x} ${y} ${z}`);
  await hold(SOFT.includes(id.split(":")[1]) ? "minecraft:diamond_shovel" : "minecraft:diamond_pickaxe");
  await call("look_at", { x: x + 0.5, y: y + 0.5, z: z + 0.5 });
  await call("break_block", { x, y, z, mode: "survival" });
  for (let i = 0; i < 40; i++) { await sleep(150); if (isAir(await block(x, y, z))) return; }
  throw new Error(`stuck on ${id} at ${x} ${y} ${z}`);
}

if (RESUME) {
  let [x, stand, z, dx, dz] = RESUME, have;
  await walkTo(x, z);
  while ((have = await count("minecraft:cobblestone")) < WANT) {
    x += dx; z += dz;
    await mine(x, stand + 1, z);
    await mine(x, stand, z);
    await walkTo(x, z);
    console.log(`tunnel at ${x} ${stand} ${z}: ${have} cobblestone`);
  }
  console.log(`done: ${have} cobblestone, tunnel ends at ${x} ${stand} ${z}`);
  process.exit(0);
}
await walkTo(73, Z);
// Stairs: each step one block further east and one lower, three blocks of headroom so I can walk down.
let x = X_START, stand = 65;
while (stand > STAND_BOTTOM) {
  stand--;
  for (const y of [stand + 2, stand + 1, stand]) await mine(x, y, Z);
  await walkTo(x, Z);
  console.log(`step down to ${x} ${stand} ${Z}`);
  x++;
}
// Tunnel east until there's enough stone.
let have;
while ((have = await count("minecraft:cobblestone")) < WANT) {
  await mine(x, stand + 1, Z);
  await mine(x, stand, Z);
  await walkTo(x, Z);
  if ((x - X_START) % 5 === 0) console.log(`tunnel at x ${x}: ${have} cobblestone`);
  x++;
}
console.log(`done: ${have} cobblestone, tunnel ends at ${x - 1} ${stand} ${Z}`);
