// Builds a 5x5 starter hut (dark oak walls, birch roof, door gap south, a window east and west) by placing blocks
// one at a time like a player would, standing inside it. Usage: node build_hut.mjs <x0> <groundY> <z0>
const [X0, G, Z0] = process.argv.slice(2).map(Number);
const X1 = X0 + 4, Z1 = Z0 + 4, CX = X0 + 2, CZ = Z0 + 2;

async function call(tool, args = {}) {
  const res = await (await fetch("http://127.0.0.1:25601", { method: "POST", body: JSON.stringify({ tool, args }) })).json();
  const text = res.content?.[0]?.text ?? "";
  try { return JSON.parse(text); } catch { return text; }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function hold(item) {
  const inv = await call("get_inventory");
  const slot = inv.hotbar.find(i => i.id === item)?.slot;
  if (slot === undefined) return false;
  await call("select_hotbar_slot", { slot });
  return true;
}

// Place a block at (x,y,z) by clicking a neighbour that is already solid.
async function put(x, y, z, against) {
  const [ax, ay, az, face] = against;
  const r = await call("place_block", { x: ax, y: ay, z: az, face });
  await sleep(120);
  return r?.placed ?? r?.result ?? r;
}

const door = (x, y, z) => x === CX && z === Z1 && y <= G + 2;
const window = (x, y, z) => y === G + 2 && z === CZ && (x === X0 || x === X1);
const wall = [];
for (let y = G + 1; y <= G + 3; y++)
  for (let x = X0; x <= X1; x++)
    for (let z = Z0; z <= Z1; z++)
      if ((x === X0 || x === X1 || z === Z0 || z === Z1) && !door(x, y, z) && !window(x, y, z)) wall.push([x, y, z]);

await call("stop_navigation");
await call("navigate_to", { x: CX + 0.5, y: G + 1, z: CZ + 0.5, reachRadius: 0.4, timeoutSeconds: 15 });
await sleep(2500);
await hold("minecraft:dark_oak_planks");
let n = 0;
for (const [x, y, z] of wall) {
  // Under a window the block below is air, so click the wall block beside it instead.
  const below = window(x, y - 1, z);
  await put(x, y, z, below ? [x, y, z === Z0 ? z + 1 : z - 1, z === Z0 ? "north" : "south"] : [x, y - 1, z, "up"]);
  if (++n % 20 === 0) { if (!(await hold("minecraft:dark_oak_planks"))) break; }
}
// Roof one above the walls: edges first (on top of the walls), then the middle from its neighbours.
const R = G + 4;
await hold("minecraft:birch_planks");
for (let x = X0; x <= X1; x++) for (let z = Z0; z <= Z1; z++) {
  if (!(x === X0 || x === X1 || z === Z0 || z === Z1)) continue;
  if (!(await hold("minecraft:birch_planks"))) await hold("minecraft:dark_oak_planks");
  await put(x, R, z, [x, R - 1, z, "up"]);
}
for (let x = X0 + 1; x <= X1 - 1; x++) for (let z = Z0 + 1; z <= Z1 - 1; z++) {
  if (!(await hold("minecraft:birch_planks"))) await hold("minecraft:dark_oak_planks");
  await put(x, R, z, [x - 1, R, z, "east"]);
}
console.log("built hut", X0, G, Z0);
