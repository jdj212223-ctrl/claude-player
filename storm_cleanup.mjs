// Clears tornado debris round the storm home: every house block (reinforced concrete/glass, spruce, stone bricks,
// lanterns...) in a 141x141 area goes, the house and bridge included, so run storm_home, storm_home_radar and
// storm_bridge right after it to put them back.
async function cmd(command) {
  const res = await (await fetch("http://127.0.0.1:25601", { method: "POST", body: JSON.stringify({ tool: "run_command", args: { command }, target: "host" }) })).json();
  return JSON.parse(res.content?.[0]?.text ?? "{}");
}
const CX = 86, CZ = -808, R = 70;
const debris = ["pmweather:reinforced_black_concrete", "pmweather:reinforced_gray_concrete", "pmweather:reinforced_white_concrete",
  "pmweather:reinforced_glass", "minecraft:spruce_planks", "minecraft:polished_andesite", "minecraft:gray_wool", "minecraft:lantern",
  "minecraft:stone_bricks", "minecraft:stone_brick_wall", "minecraft:stone_brick_slab", "minecraft:spruce_stairs"];
let removed = 0;
for (let y = 58; y <= 90; y++) for (const b of debris) {
  const r = await cmd(`fill ${CX - R} ${y} ${CZ - R} ${CX + R} ${y} ${CZ + R} minecraft:air replace ${b}`);
  const m = (r.output ?? []).join(" ").match(/filled (\d+)/i); if (m) removed += +m[1];
}
console.log(`removed ${removed} debris blocks (house + bridge get rebuilt next)`);
