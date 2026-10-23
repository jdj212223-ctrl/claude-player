// Builds a 9x7 house like a player would, one block at a time: plank floor, log corners, a cobblestone base, plank walls
// 5 high with windows and a doorway on the west side, and a flat birch/dark oak roof.
// Usage: node build_house.mjs <x0> <z0>   (house_ground.json holds the ground height per "x,z")
import { readFileSync } from "node:fs";
const dir = new URL(".", import.meta.url).pathname;
const ground = JSON.parse(readFileSync(dir + "house_ground.json", "utf8"));
const [X0, Z0] = process.argv.slice(2).map(Number);
const X1 = X0 + 8, Z1 = Z0 + 6, FLOOR = 68, TOP = 72, ROOF = 73;
const DOOR_Z = Z0 + 3;

async function call(tool, args = {}) {
  const res = await (await fetch("http://127.0.0.1:25601", { method: "POST", body: JSON.stringify({ tool, args }) })).json();
  const text = res.content?.[0]?.text ?? "";
  try { return JSON.parse(text); } catch { return text; }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const g = (x, z) => ground[`${x},${z}`] ?? 67;

async function hold(...items) {
  const inv = await call("get_inventory");
  for (const item of items) {
    const slot = inv.hotbar.find(i => i.id === item)?.slot;
    if (slot !== undefined) { await call("select_hotbar_slot", { slot }); return item; }
    // Pull a stack from the main inventory into the hotbar if needed.
    const main = inv.main.find(i => i.id === item);
    if (main) { await call("swap_slots", { slotA: main.slot, slotB: 7 }); await call("select_hotbar_slot", { slot: 7 }); }
    else continue;
    // Never place with an empty or wrong hand: check what is actually held.
    const held = (await call("get_inventory")).hotbar.find(i => i.slot === 7)?.id;
    if (held === item) return item;
  }
  return null;
}

// Walk to the closest of the given standing spots when the target is out of comfortable reach.
async function near(x, y, z, spots) {
  const me = await call("get_self");
  const d = Math.hypot(me.x - (x + 0.5), me.y + 1.6 - (y + 0.5), me.z - (z + 0.5));
  if (d <= 4.2) return;
  spots.sort((a, b) => Math.hypot(a[0] - x, a[2] - z) - Math.hypot(b[0] - x, b[2] - z));
  const [sx, sy, sz] = spots[0];
  await call("navigate_to", { x: sx + 0.5, y: sy, z: sz + 0.5, reachRadius: 0.5, timeoutSeconds: 10 });
  for (let i = 0; i < 40; i++) {
    await sleep(200);
    const st = await call("navigation_status");
    if (!st?.active) break;
  }
}

async function put(target, against, spots, ...items) {
  await near(...target, spots);
  if (!(await hold(...items))) return "out of blocks";
  const [ax, ay, az, face] = against;
  const r = await call("place_block", { x: ax, y: ay, z: az, face });
  await sleep(150);
  return r?.result;
}

const outsideNorth = [], outsideSouth = [], inside = [];
for (let x = X0; x <= X1; x++) { outsideNorth.push([x, g(x, Z0 - 2) + 1, Z0 - 2]); outsideSouth.push([x, g(x, Z1 + 2) + 1, Z1 + 2]); }
for (let x = X0 + 1; x <= X1 - 1; x++) for (let z = Z0 + 1; z <= Z1 - 1; z++) inside.push([x, FLOOR + 1, z]);
const PLANKS = ["minecraft:dark_oak_planks", "minecraft:spruce_planks", "minecraft:oak_planks", "minecraft:birch_planks"];
const log = [];

// 1. Floor, from outside, nearest rows first so we never stand where a block goes.
for (let z = Z0 + 1; z <= Z1 - 1; z++) for (let x = X0 + 1; x <= X1 - 1; x++) {
  if (g(x, z) >= FLOOR) continue;
  const spots = z <= (Z0 + Z1) / 2 ? outsideNorth : outsideSouth;
  log.push(await put([x, FLOOR, z], [x, FLOOR - 1, z, "up"], spots, ...PLANKS));
}

// 2. Walls from inside: logs on the corners, planks elsewhere, gaps for windows and the doorway.
const corner = (x, z) => (x === X0 || x === X1) && (z === Z0 || z === Z1);
const doorway = (x, y, z) => x === X0 && z === DOOR_Z && (y === FLOOR + 1 || y === FLOOR + 2);
const windowAt = (x, y, z) => y === FLOOR + 2 && !corner(x, z) && (
  ((z === Z0 || z === Z1) && (x === X0 + 2 || x === X1 - 2)) ||
  ((x === X0 || x === X1) && (z === Z0 + 1 || z === Z1 - 1)));
for (let y = FLOOR; y <= TOP; y++)
  for (let x = X0; x <= X1; x++) for (let z = Z0; z <= Z1; z++) {
    if (!(x === X0 || x === X1 || z === Z0 || z === Z1)) continue;
    if (y <= g(x, z) || doorway(x, y, z) || windowAt(x, y, z)) continue;
    // Clicking the top of the block below; above a window or doorway, click the wall block beside it.
    let against = [x, y - 1, z, "up"];
    if (windowAt(x, y - 1, z) || doorway(x, y - 1, z)) {
      if (z === Z0 || z === Z1) against = [x - 1, y, z, "east"]; else against = [x, y, z - 1, "south"];
    }
    // Stone base along the bottom while the cobblestone lasts.
    const items = corner(x, z) ? ["minecraft:dark_oak_log", "minecraft:oak_log", ...PLANKS]
      : y === FLOOR ? ["minecraft:cobblestone", ...PLANKS] : PLANKS;
    log.push(await put([x, y, z], against, inside, ...items));
  }

// 3. Roof: the edge ring on top of the walls, then fill inwards from the neighbours.
for (let x = X0; x <= X1; x++) for (let z = Z0; z <= Z1; z++)
  if (x === X0 || x === X1 || z === Z0 || z === Z1) log.push(await put([x, ROOF, z], [x, TOP, z, "up"], inside, "minecraft:birch_planks", "minecraft:dark_oak_planks"));
for (let x = X0 + 1; x <= X1 - 1; x++) for (let z = Z0 + 1; z <= Z1 - 1; z++)
  log.push(await put([x, ROOF, z], [x - 1, ROOF, z, "east"], inside, "minecraft:dark_oak_planks", "minecraft:birch_planks"));

const tally = {};
for (const r of log) tally[r] = (tally[r] ?? 0) + 1;
console.log("house done", JSON.stringify(tally));
