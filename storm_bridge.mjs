// A 5-wide stone brick bridge across the lake channel off the north-east corner of the storm home (x 99-103,
// z -817..-831, deck y 63), out of the way of the front door, wide enough for the Dominators, with low walls on the
// sides and lanterns so it can be found at night.
async function cmd(command) {
  const res = await (await fetch("http://127.0.0.1:25601", { method: "POST", body: JSON.stringify({ tool: "run_command", args: { command }, target: "host" }) })).json();
  const r = JSON.parse(res.content?.[0]?.text ?? "{}");
  if (!r.success) console.log("FAILED:", command, "→", (r.output ?? []).join(" "));
  return r;
}
const steps = [
  // Take the old bridge in front of the door away and give the lake back its water.
  "fill 78 63 -832 84 65 -814 minecraft:air",
  "fill 78 56 -831 84 62 -816 minecraft:water replace minecraft:stone_bricks",
  "fill 78 56 -831 84 62 -816 minecraft:water replace minecraft:air",
  "fill 79 63 -832 83 63 -832 minecraft:grass_block",
  // The new bridge.
  "fill 99 63 -831 103 63 -817 minecraft:stone_bricks",
  "fill 99 64 -831 103 67 -817 minecraft:air",
  "fill 98 63 -830 98 63 -818 minecraft:stone_bricks", "fill 104 63 -830 104 63 -818 minecraft:stone_bricks",
  "fill 98 64 -830 98 64 -818 minecraft:stone_brick_wall", "fill 104 64 -830 104 64 -818 minecraft:stone_brick_wall",
  ...[-821, -826].flatMap(z => [`fill 99 56 ${z} 99 62 ${z} minecraft:stone_bricks`, `fill 103 56 ${z} 103 62 ${z} minecraft:stone_bricks`]),
  ...[-818, -824, -830].flatMap(z => [`setblock 98 65 ${z} minecraft:lantern`, `setblock 104 65 ${z} minecraft:lantern`]),
];
let fails = 0;
for (const s of steps) if (!(await cmd(s)).success) fails++;
console.log(`done, ${steps.length} steps, ${fails} failed`);
