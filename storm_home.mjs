// Builds the tornado-world home by the lake (x 76-86, z -812..-804, ground y 63) with commands: PMWeather reinforced
// grey concrete walls, reinforced glass windows, a black reinforced roof, spruce floor, beds for the crew, a kitchen
// corner, chests, a storm desk with the radar, and a tornado siren + anemometer on the roof.
async function cmd(command) {
  const res = await (await fetch("http://127.0.0.1:25601", { method: "POST", body: JSON.stringify({ tool: "run_command", args: { command }, target: "host" }) })).json();
  const r = JSON.parse(res.content?.[0]?.text ?? "{}");
  if (!r.success) console.log("FAILED:", command, "→", (r.output ?? []).join(" "));
  return r;
}
const P = "pmweather:", X0 = 76, X1 = 86, Z0 = -812, Z1 = -804, G = 63;
const steps = [
  // Clear the plot (and a little air above) and lay a solid foundation.
  `fill ${X0 - 1} ${G + 1} ${Z0 - 1} ${X1 + 1} ${G + 8} ${Z1 + 1} minecraft:air`,
  `fill ${X0} ${G - 2} ${Z0} ${X1} ${G - 1} ${Z1} minecraft:stone`,
  `fill ${X0} ${G} ${Z0} ${X1} ${G} ${Z1} ${P}reinforced_gray_concrete`,
  `fill ${X0 + 1} ${G} ${Z0 + 1} ${X1 - 1} ${G} ${Z1 - 1} minecraft:spruce_planks`,
  // Walls (y 64-67), hollowed out.
  `fill ${X0} ${G + 1} ${Z0} ${X1} ${G + 4} ${Z1} ${P}reinforced_gray_concrete`,
  `fill ${X0 + 1} ${G + 1} ${Z0 + 1} ${X1 - 1} ${G + 4} ${Z1 - 1} minecraft:air`,
  // Corner pillars in white so it doesn't look like a bunker.
  ...[[X0, Z0], [X1, Z0], [X0, Z1], [X1, Z1]].map(([x, z]) => `fill ${x} ${G + 1} ${z} ${x} ${G + 4} ${z} ${P}reinforced_white_concrete`),
  // Roof with a little overhang.
  `fill ${X0 - 1} ${G + 5} ${Z0 - 1} ${X1 + 1} ${G + 5} ${Z1 + 1} ${P}reinforced_black_concrete`,
  // Reinforced glass windows: two on each long wall, one on each short wall.
  ...[78, 79, 83, 84].flatMap(x => [`fill ${x} ${G + 2} ${Z0} ${x} ${G + 3} ${Z0} ${P}reinforced_glass`, `fill ${x} ${G + 2} ${Z1} ${x} ${G + 3} ${Z1} ${P}reinforced_glass`]),
  ...[X0, X1].map(x => `fill ${x} ${G + 2} -809 ${x} ${G + 3} -807 ${P}reinforced_glass`),
  // Front door on the north wall, facing the lake, with a step and lanterns.
  `fill 81 ${G + 1} ${Z0} 81 ${G + 2} ${Z0} minecraft:air`,
  `setblock 81 ${G + 1} ${Z0} minecraft:iron_door[facing=north,half=lower,hinge=left]`,
  `setblock 81 ${G + 2} ${Z0} minecraft:iron_door[facing=north,half=upper,hinge=left]`,
  `setblock 82 ${G + 1} ${Z0 + 1} minecraft:stone_button[face=wall,facing=south]`,
  `setblock 80 ${G + 2} ${Z0 - 1} minecraft:stone_button[face=wall,facing=north]`,
  `setblock 81 ${G} ${Z0 - 1} minecraft:stone_brick_slab`,
  // Beds for the crew: jdj125, Claude, Ollama, along the south wall.
  ...[[77, "black"], [79, "orange"], [85, "white"]].flatMap(([x, c]) => [
    `setblock ${x} ${G + 1} ${Z1 - 1} minecraft:${c}_bed[facing=north,part=head]`.replace("part=head", "part=foot"),
    `setblock ${x} ${G + 1} ${Z1 - 2} minecraft:${c}_bed[facing=north,part=head]`]),
  // Kitchen corner (north-west): crafting table, furnace, smoker, chests.
  `setblock 77 ${G + 1} ${Z0 + 1} minecraft:crafting_table`,
  `setblock 78 ${G + 1} ${Z0 + 1} minecraft:furnace[facing=south]`,
  `setblock 79 ${G + 1} ${Z0 + 1} minecraft:blast_furnace[facing=south]`,
  `setblock 77 ${G + 1} ${Z0 + 2} minecraft:chest[facing=east,type=left]`,
  `setblock 77 ${G + 1} ${Z0 + 3} minecraft:chest[facing=east,type=right]`,
  // Storm desk (north-east): the radar, a sounding viewer and a chair, plus a sensor.
  `setblock 85 ${G + 1} ${Z0 + 1} ${P}radar`,
  `setblock 84 ${G + 1} ${Z0 + 1} ${P}sounding_viewer`,
  `setblock 85 ${G + 1} ${Z0 + 3} ${P}tornado_sensor`,
  `setblock 83 ${G + 1} ${Z0 + 2} minecraft:spruce_stairs[facing=north]`,
  // Rug and lights.
  `fill 80 ${G} -809 82 ${G} -807 minecraft:gray_wool`,
  ...[[78, -810], [84, -810], [78, -806], [84, -806], [81, -808]].map(([x, z]) => `setblock ${x} ${G + 4} ${z} minecraft:lantern[hanging=true]`),
  // Roof gear: tornado siren and anemometer.
  `setblock 81 ${G + 6} -808 ${P}tornado_siren`,
  `setblock 77 ${G + 6} -805 ${P}anemometer`,
];
let fails = 0;
for (const s of steps) if (!(await cmd(s)).success) fails++;
console.log(`done, ${steps.length} steps, ${fails} failed`);
