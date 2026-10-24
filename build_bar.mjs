// Turns the dug basement (x 67-73, z 700-704, y 65-67) into a tavern with commands: the cave under it filled,
// stone brick walls with dark oak pillars, a spruce floor, a 2-wide staircase from the house floor, a bar counter
// with stools, cabinets and a tap, a table corner, a Neapolitan ice cream corner, lanterns, and drinks on the wall.
async function cmd(command) {
  const res = await (await fetch("http://127.0.0.1:25601", { method: "POST", body: JSON.stringify({ tool: "run_command", args: { command }, target: "host" }) })).json();
  const r = JSON.parse(res.content?.[0]?.text ?? "{}");
  if (!r.success) console.log("FAILED:", command, "→", (r.output ?? []).join(" "));
  return r;
}
const T = "kaleidoscope_tavern:";
const drinks = "kaleidoscope_world_liquor:absolut_vodka kaleidoscope_world_liquor:bacardi_carta_blanca kaleidoscope_world_liquor:bamboo_leaf_green_liquor kaleidoscope_world_liquor:bombay_sapphire_gin kaleidoscope_world_liquor:cola kaleidoscope_world_liquor:cool_tea kaleidoscope_world_liquor:dassai kaleidoscope_world_liquor:jack_daniel kaleidoscope_world_liquor:johnnie_walker kaleidoscope_world_liquor:kwas_chlebowy kaleidoscope_world_liquor:lafite_1982 kaleidoscope_world_liquor:maotai kaleidoscope_world_liquor:pina_colada kaleidoscope_world_liquor:skyy_vodka kaleidoscope_world_liquor:smirnoff_red_vodka kaleidoscope_world_liquor:sour_plum kaleidoscope_world_liquor:spiryt_vodka".split(" ").filter(Boolean);
const steps = [
  // Fill the cave pocket under the room so nothing can ever fall through.
  ...["air", "cave_air", "water"].map(b => `fill 66 61 699 74 63 705 minecraft:stone replace minecraft:${b}`),
  // Shell: floor slab of stone bricks under everything, then the walls.
  "fill 66 64 699 74 64 705 minecraft:stone_bricks",
  "fill 66 65 699 74 67 699 minecraft:stone_bricks", "fill 66 65 705 74 67 705 minecraft:stone_bricks",
  "fill 66 65 700 66 67 704 minecraft:stone_bricks", "fill 74 65 700 74 67 704 minecraft:stone_bricks",
  ...[[66, 699], [74, 699], [66, 705], [74, 705], [70, 699], [70, 705]].map(([x, z]) => `fill ${x} 65 ${z} ${x} 67 ${z} minecraft:dark_oak_log`),
  "fill 67 65 700 73 67 704 minecraft:air",
  "fill 67 64 700 73 64 704 minecraft:spruce_planks",
  // Close the old 1x1 hatch; open a 3x2 stairwell instead and build 2-wide stairs down to the west.
  "setblock 70 68 700 minecraft:dark_oak_planks",
  "fill 68 68 702 70 68 703 minecraft:air",
  "fill 70 65 702 70 66 703 minecraft:spruce_planks", "fill 69 65 702 69 65 703 minecraft:spruce_planks",
  "fill 70 67 702 70 67 703 minecraft:spruce_stairs[facing=east]",
  "fill 69 66 702 69 66 703 minecraft:spruce_stairs[facing=east]",
  "fill 68 65 702 68 65 703 minecraft:spruce_stairs[facing=east]",
  // The bar: counter along x 72 with stools in front, cabinets and a tap behind.
  `fill 72 65 701 72 65 704 ${T}bar_counter`,
  `fill 71 65 701 71 65 704 ${T}red_bar_stool`,
  `setblock 73 65 703 ${T}glass_bar_cabinet`, `setblock 73 65 704 ${T}glass_bar_cabinet`,
  `setblock 73 65 702 ${T}bar_cabinet`, `setblock 73 65 700 ${T}barrel`,
  `setblock 72 66 703 ${T}tap`,
  // A table for two in the north-west, the ice cream corner on the south wall.
  `setblock 68 65 700 ${T}table`, `setblock 67 65 700 ${T}gray_bar_stool`, `setblock 69 65 700 ${T}gray_bar_stool`,
  "setblock 68 65 704 neapolitan:chocolate_ice_cream_block", "setblock 69 65 704 neapolitan:vanilla_ice_cream_block",
  "setblock 70 65 704 neapolitan:strawberry_ice_cream_block", "setblock 67 65 704 neapolitan:mint_ice_cream_block",
  // Light.
  ...[[68, 701], [71, 700], [71, 704], [67, 703]].map(([x, z]) => `setblock ${x} 67 ${z} minecraft:lantern[hanging=true]`),
  // Drinks on display behind the bar, in item frames on the east wall.
  ...drinks.slice(0, 7).map((d, i) => {
    const [y, z] = i < 4 ? [66, 701 + i] : [67, 701 + (i - 4)];
    return `summon minecraft:item_frame 73 ${y} ${z} {Facing:4b,Fixed:1b,Item:{id:"${d}",count:1}}`;
  }),
];
for (const s of steps) await cmd(s);
console.log(`done: ${steps.length} commands`);
