// Moves the bar staircase away from the front door (west wall, z 702) to the back corner by the beds: a 2-wide stair
// at x 69-70 going down to the south (z 701-703), entered from the bed side (east) with a spruce railing on the
// west and north. The ice cream blocks that sat on the new landing move to the west wall.
async function cmd(command) {
  const res = await (await fetch("http://127.0.0.1:25601", { method: "POST", body: JSON.stringify({ tool: "run_command", args: { command }, target: "host" }) })).json();
  const r = JSON.parse(res.content?.[0]?.text ?? "{}");
  if (!r.success) console.log("FAILED:", command, "→", (r.output ?? []).join(" "));
}
for (const c of [
  // Close the old stairwell by the door and clear the old stairs below it.
  "fill 68 68 702 70 68 703 minecraft:dark_oak_planks",
  "fill 68 65 702 70 67 703 minecraft:air",
  // Ice cream corner: off the new landing, onto the west wall.
  "fill 69 65 704 70 65 704 minecraft:air",
  "setblock 67 65 701 neapolitan:chocolate_ice_cream_block",
  "setblock 67 65 702 neapolitan:vanilla_ice_cream_block",
  "setblock 67 65 703 neapolitan:strawberry_ice_cream_block",
  // New stairwell and stairs, solid underneath.
  "fill 69 68 701 70 68 703 minecraft:air",
  "fill 69 65 701 70 66 701 minecraft:spruce_planks",
  "fill 69 65 702 70 65 702 minecraft:spruce_planks",
  "fill 69 67 701 70 67 701 minecraft:spruce_stairs[facing=north]",
  "fill 69 66 702 70 66 702 minecraft:spruce_stairs[facing=north]",
  "fill 69 65 703 70 65 703 minecraft:spruce_stairs[facing=north]",
  // Railing on the door side and the north edge; the bed side (x 71) stays open as the way down.
  "fill 68 69 701 68 69 703 minecraft:spruce_fence",
  "setblock 70 69 700 minecraft:spruce_fence",
]) await cmd(c);
console.log("done");
