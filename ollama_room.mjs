// Builds a llama-themed guest room for an Ollama-powered AI player (Ollama's logo is a llama), west of the bar hall:
// interior x 50-56, z 703-709, floor y 62, 4 high, reached through a 2-wide doorway in the hall's west wall at
// z 708-709. A bed, a desk with a ComputerCraft computer and monitor, hay bales, carpets, lanterns, a sign, and a llama.
async function cmd(command) {
  const res = await (await fetch("http://127.0.0.1:25601", { method: "POST", body: JSON.stringify({ tool: "run_command", args: { command }, target: "host" }) })).json();
  const r = JSON.parse(res.content?.[0]?.text ?? "{}");
  if (!r.success && !/No blocks were filled/.test((r.output ?? []).join(" "))) console.log("FAILED:", command, "→", (r.output ?? []).join(" "));
}
const sign = (lines) => JSON.stringify({ messages: lines.map(t => JSON.stringify({ text: t })) });
for (const c of [
  ...["air", "cave_air", "water", "lava"].map(b => `fill 48 58 701 57 61 711 minecraft:stone replace minecraft:${b}`),
  ...["air", "cave_air", "water"].map(b => `fill 49 67 702 57 67 710 minecraft:stone_bricks replace minecraft:${b}`),
  "fill 49 62 702 49 67 710 minecraft:stone_bricks", "fill 49 62 702 56 67 702 minecraft:stone_bricks",
  "fill 49 62 710 56 67 710 minecraft:stone_bricks",
  ...[[49, 702], [49, 710], [49, 706]].map(([x, z]) => `fill ${x} 62 ${z} ${x} 66 ${z} minecraft:dark_oak_log`),
  "fill 50 63 703 56 66 709 minecraft:air",
  "fill 50 62 703 56 62 709 minecraft:birch_planks",
  // Doorway into the hall, framed in dark oak.
  "fill 57 63 708 57 64 709 minecraft:air",
  "fill 57 65 708 57 65 709 minecraft:dark_oak_planks",
  // Llama-coloured carpet: cream with a brown border.
  "fill 50 63 703 56 63 709 minecraft:brown_carpet",
  "fill 51 63 704 55 63 708 minecraft:white_carpet",
  // Bed in the north-west corner, a desk with a computer and monitor on the north wall, a chair.
  "setblock 50 63 704 minecraft:white_bed[facing=north,part=foot]", "setblock 50 63 703 minecraft:white_bed[facing=north,part=head]",
  "setblock 53 63 703 computercraft:computer_advanced[facing=south]",
  "setblock 53 64 703 computercraft:monitor_advanced[facing=south]",
  "setblock 54 63 703 minecraft:oak_planks", "setblock 54 64 703 minecraft:flower_pot",
  "setblock 53 63 704 pfm:oak_chair_classic_brown[facing=north]",
  // Hay bales (llama snacks) in the south-west corner, a chest, lanterns.
  "fill 50 63 708 51 63 709 minecraft:hay_block", "setblock 50 64 709 minecraft:hay_block",
  "setblock 56 63 703 minecraft:chest[facing=west]",
  "setblock 52 66 705 minecraft:lantern[hanging=true]", "setblock 55 66 708 minecraft:lantern[hanging=true]",
  // Name signs: in the hall above the doorway, and inside.
  `setblock 58 65 708 minecraft:dark_oak_wall_sign[facing=east]{front_text:${sign(["", "Ollama's Room", "(AI guest)", ""])}}`,
  `setblock 50 65 706 minecraft:birch_wall_sign[facing=east]{front_text:${sign(["Welcome,", "Ollama!", "Beware of", "the Bacteria"])}}`,
  // The room's mascot.
  `summon minecraft:llama 54.5 63 706.5 {CustomName:'"Ollama"',CustomNameVisible:1b,PersistenceRequired:1b,Tame:1b,Variant:0}`,
]) await cmd(c);
console.log("done");
