// A big basement bar under the whole storm home (walls x 75-98, z -813..-803, floor y 55, room y 56-61), like the
// Backrooms tavern but vanilla only: stone brick walls with dark oak pillars, a spruce floor, a 2-wide staircase down
// from the radar room's south-east corner with a railing round the hole, a long counter with stools, barrels and
// brewing stands behind it, two tables, a dance floor with a jukebox, and lanterns.
async function cmd(command) {
  const res = await (await fetch("http://127.0.0.1:25601", { method: "POST", body: JSON.stringify({ tool: "run_command", args: { command }, target: "host" }) })).json();
  const r = JSON.parse(res.content?.[0]?.text ?? "{}");
  if (!r.success) console.log("FAILED:", command, "→", (r.output ?? []).join(" "));
  return r;
}
const steps = [
  // Shell: solid stone bricks all round (so no cave or water gets in), then hollow it out.
  "fill 75 54 -813 98 62 -803 minecraft:stone_bricks",
  "fill 76 56 -812 97 61 -804 minecraft:air",
  "fill 76 55 -812 97 55 -804 minecraft:spruce_planks",
  ...[76, 82, 88, 97].flatMap(x => [`fill ${x} 56 -812 ${x} 61 -812 minecraft:dark_oak_log`, `fill ${x} 56 -804 ${x} 61 -804 minecraft:dark_oak_log`]),
  // Staircase: down from the radar room floor (y 63) heading west along the south wall, z -806..-805.
  // The top step is one block in from the east wall so you can walk onto it from the radar room floor at x 96.
  "fill 96 63 -806 96 63 -805 minecraft:polished_andesite", "fill 90 64 -807 96 64 -805 minecraft:air",
  "fill 89 57 -806 95 63 -805 minecraft:air",
  ...[[95, 62], [94, 61], [93, 60], [92, 59], [91, 58], [90, 57], [89, 56]].flatMap(([x, y]) => [
    `fill ${x} ${y} -806 ${x} ${y} -805 minecraft:spruce_stairs[facing=east]`,
    ...(y > 56 ? [`fill ${x} 56 -806 ${x} ${y - 1} -805 minecraft:stone_bricks`] : [])]),
  // Railing round the hole upstairs.
  "fill 88 64 -807 95 64 -807 minecraft:spruce_fence", "fill 88 64 -806 88 64 -805 minecraft:spruce_fence",
  // The bar: a long counter along z -809 (gap at x 79 to get behind), barrels and brewing stands on the back wall.
  "fill 80 56 -809 94 56 -809 minecraft:dark_oak_planks",
  "fill 80 57 -809 94 57 -809 minecraft:dark_oak_slab[type=bottom]",
  "fill 77 56 -812 96 56 -812 minecraft:barrel[facing=south] replace minecraft:air",
  "fill 77 56 -811 81 56 -811 minecraft:barrel[facing=south]", "fill 92 56 -811 96 56 -811 minecraft:barrel[facing=south]",
  ...[78, 84, 90, 95].map(x => `setblock ${x} 57 -811 minecraft:brewing_stand`),
  ...[80, 93].map(x => `setblock ${x} 57 -811 minecraft:cauldron`),
  ...[79, 94].map(x => `setblock ${x} 57 -811 minecraft:decorated_pot`),
  ...[77, 81, 92, 96].map(x => `setblock ${x} 57 -811 minecraft:candle[candles=3,lit=true]`),
  "setblock 86 56 -811 minecraft:chest[facing=south,type=left]", "setblock 87 56 -811 minecraft:chest[facing=south,type=right]",
  // Stools in front of the counter.
  ...[81, 83, 85, 87, 89, 91, 93].flatMap(x => [`setblock ${x} 56 -808 minecraft:spruce_fence`, `setblock ${x} 57 -808 minecraft:red_carpet`]),
  // Two tables for four in the south-west.
  ...[78, 83].flatMap(x => [
    `setblock ${x} 56 -806 minecraft:spruce_fence`, `setblock ${x} 57 -806 minecraft:spruce_pressure_plate`,
    `setblock ${x - 1} 56 -806 minecraft:spruce_stairs[facing=west]`, `setblock ${x + 1} 56 -806 minecraft:spruce_stairs[facing=east]`,
    `setblock ${x} 56 -805 minecraft:spruce_stairs[facing=south]`, `setblock ${x} 56 -807 minecraft:spruce_stairs[facing=north]`]),
  // A checkered dance floor with a jukebox.
  ...[...Array(3).keys()].flatMap(i => [...Array(3).keys()].map(j => `setblock ${85 + i} 55 ${-807 + j} minecraft:${(i + j) % 2 ? "black" : "white"}_wool`)),
  "setblock 88 56 -804 minecraft:jukebox",
  // Lights.
  ...[[79, -810], [84, -810], [89, -810], [94, -810], [78, -805], [83, -805], [86, -806]].map(([x, z]) => `setblock ${x} 61 ${z} minecraft:lantern[hanging=true]`),
];
let fails = 0;
for (const s of steps) if (!(await cmd(s)).success) fails++;
console.log(`done, ${steps.length} steps, ${fails} failed`);
