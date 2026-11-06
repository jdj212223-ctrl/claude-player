// The tornado world's second home, a fortress by the lake: walls three blocks thick (reinforced deepslate outside,
// which PMWeather damages only at 504 mph, obsidian at 484 in the middle, reinforced grey concrete inside), a roof
// two blocks thick, and reinforced glass windows. Outer walls x 72-101, z -816..-800, floor y 63. Inside: bedrooms and
// a kitchen in the west half, the radar room in the east half, and a big basement bar under all of it (floor y 54)
// down a 2-wide staircase in the radar room's south-east corner. Replaces storm_home, storm_home_radar and storm_bar.
async function cmd(command) {
  const res = await (await fetch("http://127.0.0.1:25601", { method: "POST", body: JSON.stringify({ tool: "run_command", args: { command }, target: "host" }) })).json();
  const r = JSON.parse(res.content?.[0]?.text ?? "{}");
  if (!r.success) console.log("FAILED:", command, "→", (r.output ?? []).join(" "));
  return r;
}
const P = "pmweather:", DS = "minecraft:reinforced_deepslate", OB = "minecraft:obsidian", RC = P + "reinforced_gray_concrete";
const X0 = 72, X1 = 101, Z0 = -816, Z1 = -800, G = 63, TOP = 69; // outer box; walls y 64-69, roof y 70-71
const steps = [
  // Clear the old house and everything round the new one, down to the basement.
  `fill ${X0 - 2} ${G + 1} ${Z0 - 2} ${X1 + 2} ${TOP + 6} ${Z1 + 2} minecraft:air`,
  `fill ${X0} 52 ${Z0} ${X1} ${G} ${Z1} minecraft:air`,
  // Basement shell (y 53-62) in reinforced deepslate, hollow inside, with a spruce floor.
  `fill ${X0} 52 ${Z0} ${X1} 62 ${Z1} ${DS}`,
  `fill ${X0 + 3} 55 ${Z0 + 3} ${X1 - 3} 61 ${Z1 - 3} minecraft:air`,
  `fill ${X0 + 3} 54 ${Z0 + 3} ${X1 - 3} 54 ${Z1 - 3} minecraft:spruce_planks`,
  // Ground floor slab.
  `fill ${X0} ${G} ${Z0} ${X1} ${G} ${Z1} ${DS}`,
  `fill ${X0 + 3} ${G} ${Z0 + 3} ${X1 - 3} ${G} ${Z1 - 3} minecraft:spruce_planks`,
  // Walls: deepslate shell, obsidian core, concrete lining, then hollow the inside.
  `fill ${X0} ${G + 1} ${Z0} ${X1} ${TOP} ${Z1} ${DS}`,
  `fill ${X0 + 1} ${G + 1} ${Z0 + 1} ${X1 - 1} ${TOP} ${Z1 - 1} ${OB}`,
  `fill ${X0 + 2} ${G + 1} ${Z0 + 2} ${X1 - 2} ${TOP} ${Z1 - 2} ${RC}`,
  `fill ${X0 + 3} ${G + 1} ${Z0 + 3} ${X1 - 3} ${TOP} ${Z1 - 3} minecraft:air`,
  // Roof: two layers, deepslate over obsidian, with a small overhang.
  `fill ${X0 - 1} ${TOP + 1} ${Z0 - 1} ${X1 + 1} ${TOP + 1} ${Z1 + 1} ${OB}`,
  `fill ${X0 - 1} ${TOP + 2} ${Z0 - 1} ${X1 + 1} ${TOP + 2} ${Z1 + 1} ${DS}`,
  // Divider between the living side and the radar room (x 87), with a 3-wide doorway.
  `fill 87 ${G + 1} ${Z0 + 3} 87 ${TOP} ${Z1 - 3} ${RC}`,
  `fill 87 ${G + 1} -809 87 ${G + 3} -807 minecraft:air`,
  // Windows through all three layers, two blocks tall: front (north), back (south), west and east.
  ...[77, 78, 82, 83, 91, 92, 96, 97].flatMap(x => [
    `fill ${x} ${G + 2} ${Z0} ${x} ${G + 3} ${Z0 + 2} ${P}reinforced_glass`,
    `fill ${x} ${G + 2} ${Z1 - 2} ${x} ${G + 3} ${Z1} ${P}reinforced_glass`]),
  ...[X0, X1].map(x => `fill ${x} ${G + 2} -809 ${x === X0 ? x + 2 : x} ${G + 3} -807 ${P}reinforced_glass`),
  `fill ${X1 - 2} ${G + 2} -809 ${X1} ${G + 3} -807 ${P}reinforced_glass`,
  // Front door: a 3-deep iron doorway in the north wall at x 81, buttons inside and out, a step outside.
  `fill 81 ${G + 1} ${Z0} 81 ${G + 2} ${Z0 + 2} minecraft:air`,
  `setblock 81 ${G + 1} ${Z0} minecraft:iron_door[facing=north,half=lower,hinge=left]`,
  `setblock 81 ${G + 2} ${Z0} minecraft:iron_door[facing=north,half=upper,hinge=left]`,
  // A porch in front of the door over the lake edge, joining the land to the east.
  "fill 78 56 -820 88 62 -817 minecraft:stone", "fill 78 63 -820 88 63 -817 minecraft:polished_deepslate",
  "fill 78 64 -820 88 66 -818 minecraft:air",
  // Pressure plates on both sides so it opens by itself (a button was too easy to miss), and lanterns to find it.
  `setblock 81 ${G} ${Z0 - 1} minecraft:polished_deepslate`, `setblock 81 ${G + 1} ${Z0 - 1} minecraft:stone_pressure_plate`,
  `setblock 81 ${G + 1} ${Z0 + 1} minecraft:stone_pressure_plate`,
  `setblock 79 ${G + 3} ${Z0 - 1} minecraft:lantern[hanging=false]`, `setblock 83 ${G + 3} ${Z0 - 1} minecraft:lantern[hanging=false]`,
  `fill 79 ${G + 2} ${Z0 - 1} 79 ${G + 2} ${Z0 - 1} minecraft:polished_deepslate_wall`, `fill 83 ${G + 2} ${Z0 - 1} 83 ${G + 2} ${Z0 - 1} minecraft:polished_deepslate_wall`,
  // Living side (x 75-86): beds for the crew on the south wall, kitchen and chests on the north wall.
  ...[[76, "black"], [78, "orange"], [80, "white"]].flatMap(([x, c]) => [
    `setblock ${x} ${G + 1} ${Z1 - 3} minecraft:${c}_bed[facing=north,part=foot]`,
    `setblock ${x} ${G + 1} ${Z1 - 4} minecraft:${c}_bed[facing=north,part=head]`]),
  `setblock 75 ${G + 1} ${Z0 + 3} minecraft:crafting_table`,
  `setblock 76 ${G + 1} ${Z0 + 3} minecraft:furnace[facing=south]`,
  `setblock 77 ${G + 1} ${Z0 + 3} minecraft:blast_furnace[facing=south]`,
  `setblock 78 ${G + 1} ${Z0 + 3} minecraft:smoker[facing=south]`,
  `setblock 79 ${G + 1} ${Z0 + 3} minecraft:spruce_planks`, `setblock 79 ${G + 2} ${Z0 + 3} interceptors:laptop`,
  `setblock 75 ${G + 1} ${Z0 + 4} minecraft:chest[facing=east,type=left]`, `setblock 75 ${G + 1} ${Z0 + 5} minecraft:chest[facing=east,type=right]`,
  `setblock 75 ${G + 1} ${Z0 + 7} minecraft:chest[facing=east,type=left]`, `setblock 75 ${G + 1} ${Z0 + 8} minecraft:chest[facing=east,type=right]`,
  `fill 80 ${G} -810 84 ${G} -806 minecraft:gray_wool`,
  // Radar room (x 88-98): the radar in the middle, sounding viewer and tornado sensor by the north wall.
  `setblock 93 ${G + 1} -810 ${P}radar`,
  // Range upgrade modules on all four sides of the radar extend its range.
  ...[[92, -810], [94, -810], [93, -811], [93, -809]].map(([x, z]) => `setblock ${x} ${G + 1} ${z} ${P}range_upgrade_module`),
  `setblock 89 ${G + 1} ${Z0 + 3} ${P}sounding_viewer`,
  `setblock 90 ${G + 1} ${Z0 + 3} ${P}tornado_sensor`,
  // Staircase to the basement along the south wall (z -804..-803), heading west from x 97 down to the floor.
  `fill 90 55 -804 97 ${G} -803 minecraft:air`,
  ...[[97, 62], [96, 61], [95, 60], [94, 59], [93, 58], [92, 57], [91, 56], [90, 55]].flatMap(([x, y]) => [
    `fill ${x} ${y} -804 ${x} ${y} -803 minecraft:spruce_stairs[facing=east]`,
    ...(y > 55 ? [`fill ${x} 55 -804 ${x} ${y - 1} -803 ${DS}`] : [])]),
  `fill 90 ${G + 1} -805 97 ${G + 1} -805 minecraft:spruce_fence`, `fill 89 ${G + 1} -804 89 ${G + 1} -803 minecraft:spruce_fence`,
  // Basement bar (x 75-98, z -813..-803, floor y 54): counter, stools, back bar, tables, dance floor, jukebox.
  "fill 78 55 -810 94 55 -810 minecraft:dark_oak_planks", "fill 78 56 -810 94 56 -810 minecraft:dark_oak_slab[type=bottom]",
  "fill 76 55 -813 97 55 -813 minecraft:barrel[facing=south]",
  "fill 76 55 -812 80 55 -812 minecraft:barrel[facing=south]", "fill 92 55 -812 97 55 -812 minecraft:barrel[facing=south]",
  ...[77, 84, 93].map(x => `setblock ${x} 56 -812 minecraft:brewing_stand`),
  ...[79, 95].map(x => `setblock ${x} 56 -812 minecraft:cauldron`),
  ...[78, 94].map(x => `setblock ${x} 56 -812 minecraft:candle[candles=3,lit=true]`),
  "setblock 86 55 -812 minecraft:chest[facing=south,type=left]", "setblock 87 55 -812 minecraft:chest[facing=south,type=right]",
  ...[79, 81, 83, 85, 87, 89, 91, 93].flatMap(x => [`setblock ${x} 55 -809 minecraft:spruce_fence`, `setblock ${x} 56 -809 minecraft:red_carpet`]),
  ...[77, 82].flatMap(x => [
    `setblock ${x} 55 -805 minecraft:spruce_fence`, `setblock ${x} 56 -805 minecraft:spruce_pressure_plate`,
    `setblock ${x - 1} 55 -805 minecraft:spruce_stairs[facing=west]`, `setblock ${x + 1} 55 -805 minecraft:spruce_stairs[facing=east]`,
    `setblock ${x} 55 -804 minecraft:spruce_stairs[facing=south]`, `setblock ${x} 55 -806 minecraft:spruce_stairs[facing=north]`]),
  ...[...Array(3).keys()].flatMap(i => [...Array(3).keys()].map(j => `setblock ${85 + i} 54 ${-807 + j} minecraft:${(i + j) % 2 ? "black" : "white"}_wool`)),
  "setblock 88 55 -803 minecraft:jukebox",
  // Lights: lanterns upstairs and down.
  ...[[78, -810], [84, -810], [78, -805], [84, -805], [91, -810], [96, -810], [93, -806]].map(([x, z]) => `setblock ${x} ${TOP} ${z} minecraft:lantern[hanging=true]`),
  ...[[78, -811], [85, -811], [92, -811], [78, -804], [84, -806], [95, -806]].map(([x, z]) => `setblock ${x} 61 ${z} minecraft:lantern[hanging=true]`),
  // The look (the user's pick: modern, cabin and Team Dominator combined), only on the outside layer so the obsidian
  // core still holds: a grey base course, white walls, an orange stripe, a spruce trim band under the roof, black
  // corners, and a black roof with a spruce edge. Glass, the door and buttons are left alone (replace only deepslate).
  ...[[X0, Z0, X1, Z0], [X0, Z1, X1, Z1], [X0, Z0, X0, Z1], [X1, Z0, X1, Z1]].flatMap(([a, b, c, d]) => [
    `fill ${a} ${G} ${b} ${c} ${G + 1} ${d} ${P}reinforced_gray_concrete replace ${DS}`,
    `fill ${a} ${G + 2} ${b} ${c} ${TOP - 1} ${d} ${P}reinforced_white_concrete replace ${DS}`,
    `fill ${a} ${G + 4} ${b} ${c} ${G + 4} ${d} ${P}reinforced_orange_concrete replace ${P}reinforced_white_concrete`,
    `fill ${a} ${TOP} ${b} ${c} ${TOP} ${d} minecraft:stripped_spruce_log[axis=${a === c ? "z" : "x"}] replace ${DS}`]),
  ...[[X0, Z0], [X1, Z0], [X0, Z1], [X1, Z1]].map(([x, z]) => `fill ${x} ${G} ${z} ${x} ${TOP} ${z} ${P}reinforced_black_concrete`),
  `fill ${X0 - 1} ${TOP + 2} ${Z0 - 1} ${X1 + 1} ${TOP + 2} ${Z1 + 1} ${P}reinforced_black_concrete`,
  ...[[X0 - 1, Z0 - 1, X1 + 1, Z0 - 1], [X0 - 1, Z1 + 1, X1 + 1, Z1 + 1], [X0 - 1, Z0 - 1, X0 - 1, Z1 + 1], [X1 + 1, Z0 - 1, X1 + 1, Z1 + 1]]
    .map(([a, b, c, d]) => `fill ${a} ${TOP + 2} ${b} ${c} ${TOP + 2} ${d} minecraft:spruce_planks`),
  // Roof gear.
  `setblock 86 ${TOP + 3} -808 ${P}tornado_siren`,
  `setblock 74 ${TOP + 3} -802 ${P}anemometer`,
];
let fails = 0;
for (const s of steps) if (!(await cmd(s)).success) fails++;
console.log(`done, ${steps.length} steps, ${fails} failed`);
