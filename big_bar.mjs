// Grows the basement bar into a 16x11 hall (x 58-73, z 700-710), one level deeper (floor y 62, 4 high; 5 under the
// house), reaching west and south where the ground is thick enough (the east side is a hillside). The stairs gain two
// steps and land in the hall; a 10-block bar runs along the east wall with all 17 drinks framed behind it.
async function cmd(command) {
  const res = await (await fetch("http://127.0.0.1:25601", { method: "POST", body: JSON.stringify({ tool: "run_command", args: { command }, target: "host" }) })).json();
  const r = JSON.parse(res.content?.[0]?.text ?? "{}");
  if (!r.success && !/No blocks were filled|No entity was found/.test((r.output ?? []).join(" "))) console.log("FAILED:", command, "→", (r.output ?? []).join(" "));
}
const T = "kaleidoscope_tavern:", N = "neapolitan:";
const drinks = "kaleidoscope_world_liquor:absolut_vodka kaleidoscope_world_liquor:bacardi_carta_blanca kaleidoscope_world_liquor:bamboo_leaf_green_liquor kaleidoscope_world_liquor:bombay_sapphire_gin kaleidoscope_world_liquor:cola kaleidoscope_world_liquor:cool_tea kaleidoscope_world_liquor:dassai kaleidoscope_world_liquor:jack_daniel kaleidoscope_world_liquor:johnnie_walker kaleidoscope_world_liquor:kwas_chlebowy kaleidoscope_world_liquor:lafite_1982 kaleidoscope_world_liquor:maotai kaleidoscope_world_liquor:pina_colada kaleidoscope_world_liquor:skyy_vodka kaleidoscope_world_liquor:smirnoff_red_vodka kaleidoscope_world_liquor:sour_plum kaleidoscope_world_liquor:spiryt_vodka".split(" ").filter(Boolean);
const steps = [
  "kill @e[type=minecraft:item_frame,x=56,y=60,z=698,dx=20,dy=10,dz=15]",
  // Seal everything around the hall first: caves and water below, thin spots in the ground above.
  ...["air", "cave_air", "water", "lava"].map(b => `fill 56 57 698 75 61 712 minecraft:stone replace minecraft:${b}`),
  ...["air", "cave_air", "water"].flatMap(b => [`fill 57 67 699 65 67 711 minecraft:stone_bricks replace minecraft:${b}`, `fill 66 67 706 74 67 711 minecraft:stone_bricks replace minecraft:${b}`]),
  // Walls, then hollow it out (the old room's walls inside go), floor.
  "fill 57 62 699 57 67 711 minecraft:stone_bricks", "fill 74 62 699 74 67 711 minecraft:stone_bricks",
  "fill 57 62 699 74 67 699 minecraft:stone_bricks", "fill 57 62 711 74 67 711 minecraft:stone_bricks",
  "fill 58 63 700 73 66 710 minecraft:air",
  "fill 58 62 700 73 62 710 minecraft:spruce_planks",
  ...[[57, 703], [57, 707], [74, 703], [74, 707], [61, 699], [65, 699], [61, 711], [65, 711], [69, 711], [57, 699], [74, 699], [57, 711], [74, 711]]
    .map(([x, z]) => `fill ${x} 62 ${z} ${x} 66 ${z} minecraft:dark_oak_log`),
  // Stairs: from the house floor down five steps to the south, solid underneath, landing at z 707.
  "fill 69 63 702 70 66 702 minecraft:spruce_planks", "fill 69 63 703 70 65 703 minecraft:spruce_planks",
  "fill 69 63 704 70 64 704 minecraft:spruce_planks", "fill 69 63 705 70 63 705 minecraft:spruce_planks",
  ...[[67, 702], [66, 703], [65, 704], [64, 705], [63, 706]].map(([y, z]) => `fill 69 ${y} ${z} 70 ${y} ${z} minecraft:spruce_stairs[facing=north]`),
  // The bar along the east wall: counter, stools with gaps to walk between, cabinets and barrels behind, a tap.
  `fill 72 63 700 72 63 709 ${T}bar_counter`,
  ...[701, 703, 705, 707, 709].map(z => `setblock 71 63 ${z} ${T}red_bar_stool`),
  ...[700, 701, 708, 709].map(z => `setblock 73 63 ${z} ${T}glass_bar_cabinet`),
  ...[704, 705].map(z => `setblock 73 63 ${z} ${T}bar_cabinet`),
  ...[702, 706].map(z => `setblock 73 63 ${z} ${T}barrel`),
  `setblock 72 64 704 ${T}tap`, `setblock 72 64 708 ${T}tap`,
  // Four tables with stools on the west side.
  ...[[60, 702], [64, 702], [60, 707], [64, 707]].flatMap(([x, z]) => [`setblock ${x} 63 ${z} ${T}table`, `setblock ${x - 1} 63 ${z} ${T}gray_bar_stool`, `setblock ${x + 1} 63 ${z} ${T}gray_bar_stool`]),
  // Ice cream corner, north-west.
  ...["chocolate", "vanilla", "strawberry", "mint", "banana", "adzuki"].map((f, i) => `setblock 58 63 ${700 + i} ${N}${f}_ice_cream_block`),
  // Lanterns hanging from the ceiling (y 67), clear of the stairs.
  ...[60, 64, 72].flatMap(x => [701, 705, 709].map(z => `setblock ${x} 66 ${z} minecraft:lantern[hanging=true]`)),
  "setblock 67 66 709 minecraft:lantern[hanging=true]",
  // All the drinks on display behind the bar, two rows on the east wall.
  ...drinks.map((d, i) => `summon minecraft:item_frame 73 ${64 + (i >= 10 ? 1 : 0)} ${700 + (i % 10)} {Facing:4b,Fixed:1b,Item:{id:"${d}",count:1}}`),
];
for (const s of steps) await cmd(s);
console.log(`done: ${steps.length} commands`);
