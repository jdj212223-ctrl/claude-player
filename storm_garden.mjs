// Turns the bare, tornado-scoured ground round the storm home back into a garden: grass over the dirt and scouring,
// a path round the house, flower beds along the walls, a few trees and berry bushes.
async function call(tool, args) {
  const res = await (await fetch("http://127.0.0.1:25601", { method: "POST", body: JSON.stringify({ tool, args, target: "host" }) })).json();
  return JSON.parse(res.content?.[0]?.text ?? "{}");
}
const fails = [];
const cmd = async c => { const r = await call("run_command", { command: c }); if (!r.success) fails.push(c + " → " + (r.output ?? []).join(" ")); };
const X0 = 70, X1 = 103, Z0 = -816, Z1 = -794, HX0 = 76, HX1 = 97, HZ0 = -812, HZ1 = -804;
const top = {};
for (let x = X0; x <= X1; x += 8) for (let z = Z0; z <= Z1; z += 8) {
  const r = await call("get_blocks_region", { from: { x, y: 58, z }, to: { x: Math.min(x + 7, X1), y: 72, z: Math.min(z + 7, Z1) } });
  for (const b of r.blocks) {
    if (/air|plants|short_grass|tall_grass|fern|flower|dandelion|poppy/.test(b.id)) continue;
    const k = b.x + "," + b.z; if ((top[k]?.y ?? -1) < b.y) top[k] = b;
  }
}
const inHouse = (x, z) => x >= HX0 - 1 && x <= HX1 + 1 && z >= HZ0 - 1 && z <= HZ1 + 1;
const onBridge = (x, z) => x >= 98 && x <= 104 && z <= -817;
const ground = (x, z) => { const b = top[x + "," + z]; return b && /dirt|grass_block|scour|sand/.test(b.id) ? b.y : null; };
// 1. Grass everywhere outside the house, and clear the tornado debris plants.
await cmd(`fill ${X0} 60 ${Z0} ${X1} 70 ${Z1} minecraft:air replace pmweather:plants2`);
await cmd(`fill ${X0} 60 ${Z0} ${X1} 70 ${Z1} minecraft:air replace pmweather:plants3`);
for (const [k, b] of Object.entries(top)) {
  const [x, z] = k.split(",").map(Number);
  if (inHouse(x, z) || onBridge(x, z) || !/dirt|scour/.test(b.id)) continue;
  await cmd(`setblock ${x} ${b.y} ${z} minecraft:grass_block`);
}
// 2. A path ring one block out from the walls, joining the bridge at the front door.
for (let x = HX0 - 2; x <= HX1 + 2; x++) for (let z = HZ0 - 2; z <= HZ1 + 2; z++) {
  if (!(x === HX0 - 2 || x === HX1 + 2 || z === HZ0 - 2 || z === HZ1 + 2) || onBridge(x, z)) continue;
  const y = ground(x, z); if (y != null) await cmd(`setblock ${x} ${y} ${z} minecraft:dirt_path`);
}
// 3. Flower beds right against the south wall and the east wall.
const flowers = ["poppy", "dandelion", "cornflower", "oxeye_daisy", "allium", "azure_bluet", "red_tulip", "orange_tulip"];
let f = 0;
for (let x = HX0; x <= HX1; x++) { const y = ground(x, HZ1 + 1); if (y != null && x % 3) await cmd(`setblock ${x} ${y + 1} ${HZ1 + 1} minecraft:${flowers[f++ % flowers.length]}`); }
for (let z = HZ0; z <= HZ1; z++) { const y = ground(HX1 + 1, z); if (y != null && z % 2) await cmd(`setblock ${HX1 + 1} ${y + 1} ${z} minecraft:${flowers[f++ % flowers.length]}`); }
// 4. Trees and berry bushes out in the yard.
for (const [x, z, t] of [[72, -799, "oak"], [86, -797, "birch"], [100, -799, "oak"], [101, -813, "birch"], [93, -796, "oak"]]) {
  const y = ground(x, z); if (y != null) await cmd(`place feature minecraft:${t} ${x} ${y + 1} ${z}`);
}
for (const [x, z] of [[79, -799], [80, -799], [90, -800], [91, -800]]) { const y = ground(x, z); if (y != null) await cmd(`setblock ${x} ${y + 1} ${z} minecraft:sweet_berry_bush[age=3]`); }
// 5. Some grass tufts so it doesn't look mowed flat.
for (const [k, b] of Object.entries(top)) {
  const [x, z] = k.split(",").map(Number);
  if (inHouse(x, z) || onBridge(x, z) || (x * 7 + z * 13) % 6 || !/dirt|scour|grass_block/.test(b.id)) continue;
  await cmd(`execute if block ${x} ${b.y + 1} ${z} minecraft:air run setblock ${x} ${b.y + 1} ${z} minecraft:short_grass`);
}
console.log("done", fails.length ? "\n" + fails.slice(0, 8).join("\n") : "0 failed");
