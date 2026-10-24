// Keeps the house walkable: the stairwell shrinks to x 69-70, z 702-703 so the z 701 row stays a walkway from the
// door to the beds. Stairs go down to the south (z 702-704), entered from that walkway; a railing on the door side.
async function cmd(command) {
  const res = await (await fetch("http://127.0.0.1:25601", { method: "POST", body: JSON.stringify({ tool: "run_command", args: { command }, target: "host" }) })).json();
  const r = JSON.parse(res.content?.[0]?.text ?? "{}");
  if (!r.success) console.log("FAILED:", command, "→", (r.output ?? []).join(" "));
}
for (const c of [
  "fill 69 68 701 70 68 701 minecraft:dark_oak_planks",
  "setblock 68 69 701 minecraft:air", "setblock 70 69 700 minecraft:air",
  "fill 69 65 701 70 67 704 minecraft:air",
  "fill 69 65 702 70 66 702 minecraft:spruce_planks",
  "fill 69 65 703 70 65 703 minecraft:spruce_planks",
  "fill 69 67 702 70 67 702 minecraft:spruce_stairs[facing=north]",
  "fill 69 66 703 70 66 703 minecraft:spruce_stairs[facing=north]",
  "fill 69 65 704 70 65 704 minecraft:spruce_stairs[facing=north]",
  // Step off the bottom stair to the west: the old chocolate block there moves out (there's one on the west wall).
  "setblock 68 65 704 minecraft:air",
]) await cmd(c);
console.log("done");
