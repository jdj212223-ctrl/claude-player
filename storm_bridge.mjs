// A 5-wide stone brick bridge across the lake channel east of the storm home's north-east corner (x 106-110,
// z -817..-831, deck y 63), out of the way of the front door, wide enough for the Dominators, with low walls on the
// sides and lanterns so it can be found at night.
async function cmd(command) {
  const res = await (await fetch("http://127.0.0.1:25601", { method: "POST", body: JSON.stringify({ tool: "run_command", args: { command }, target: "host" }) })).json();
  const r = JSON.parse(res.content?.[0]?.text ?? "{}");
  if (!r.success) console.log("FAILED:", command, "→", (r.output ?? []).join(" "));
  return r;
}
const steps = [
  // Take the older bridges away (in front of the door, then at x 99-103 right by the bigger house) and give the lake
  // back its water.
  "fill 78 63 -832 84 65 -818 minecraft:air",
  "fill 78 56 -831 84 62 -816 minecraft:water replace minecraft:stone_bricks",
  "fill 98 63 -831 104 65 -817 minecraft:air",
  "fill 98 56 -831 104 62 -817 minecraft:water replace minecraft:stone_bricks",
  "fill 98 56 -830 104 62 -818 minecraft:water replace minecraft:air",
  // The new bridge, well clear of the house's north-east corner.
  "fill 106 63 -831 110 63 -817 minecraft:stone_bricks",
  "fill 106 64 -831 110 67 -817 minecraft:air",
  "fill 105 63 -830 105 63 -818 minecraft:stone_bricks", "fill 111 63 -830 111 63 -818 minecraft:stone_bricks",
  "fill 105 64 -830 105 64 -818 minecraft:stone_brick_wall", "fill 111 64 -830 111 64 -818 minecraft:stone_brick_wall",
  ...[-821, -826].flatMap(z => [`fill 106 56 ${z} 106 62 ${z} minecraft:stone_bricks`, `fill 110 56 ${z} 110 62 ${z} minecraft:stone_bricks`]),
  ...[-818, -824, -830].flatMap(z => [`setblock 105 65 ${z} minecraft:lantern`, `setblock 111 65 ${z} minecraft:lantern`]),
];
let fails = 0;
for (const s of steps) if (!(await cmd(s)).success) fails++;
console.log(`done, ${steps.length} steps, ${fails} failed`);
