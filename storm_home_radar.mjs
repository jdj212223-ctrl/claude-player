// Adds a big radar room to the east of the storm home (x 87-97, same z), opened into the house through the old east
// wall, with a taller ceiling (y 64-70) so an extended radar with upgrade modules or a radome fits.
async function cmd(command) {
  const res = await (await fetch("http://127.0.0.1:25601", { method: "POST", body: JSON.stringify({ tool: "run_command", args: { command }, target: "host" }) })).json();
  const r = JSON.parse(res.content?.[0]?.text ?? "{}");
  if (!r.success) console.log("FAILED:", command, "→", (r.output ?? []).join(" "));
  return r;
}
const P = "pmweather:", X0 = 86, X1 = 97, Z0 = -812, Z1 = -804, G = 63, H = 7;
const steps = [
  `fill ${X0 + 1} ${G + 1} ${Z0 - 1} ${X1 + 1} ${G + H + 3} ${Z1 + 1} minecraft:air`,
  `fill ${X0 + 1} ${G - 6} ${Z0} ${X1} ${G - 1} ${Z1} minecraft:stone`,
  `fill ${X0 + 1} ${G} ${Z0} ${X1} ${G} ${Z1} ${P}reinforced_gray_concrete`,
  `fill ${X0 + 1} ${G} ${Z0 + 1} ${X1 - 1} ${G} ${Z1 - 1} minecraft:polished_andesite`,
  `fill ${X0 + 1} ${G + 1} ${Z0} ${X1} ${G + H} ${Z1} ${P}reinforced_gray_concrete`,
  `fill ${X0 + 1} ${G + 1} ${Z0 + 1} ${X1 - 1} ${G + H} ${Z1 - 1} minecraft:air`,
  ...[[X1, Z0], [X1, Z1], [X0, Z0], [X0, Z1]].map(([x, z]) => `fill ${x} ${G + 1} ${z} ${x} ${G + H} ${z} ${P}reinforced_white_concrete`),
  `fill ${X0 + 1} ${G + H + 1} ${Z0 - 1} ${X1 + 1} ${G + H + 1} ${Z1 + 1} ${P}reinforced_black_concrete`,
  // Open the old east wall into a wide doorway (keeping the radar-desk corner intact) and raise the wall above it.
  `fill ${X0} ${G + 1} ${Z0 + 3} ${X0} ${G + 3} ${Z1 - 1} minecraft:air`,
  `fill ${X0} ${G + 5} ${Z0} ${X0} ${G + H} ${Z1} ${P}reinforced_gray_concrete`,
  // Windows on every outside wall of the radar room.
  ...[89, 90, 94, 95].flatMap(x => [`fill ${x} ${G + 2} ${Z0} ${x} ${G + 4} ${Z0} ${P}reinforced_glass`, `fill ${x} ${G + 2} ${Z1} ${x} ${G + 4} ${Z1} ${P}reinforced_glass`]),
  `fill ${X1} ${G + 2} -809 ${X1} ${G + 4} -807 ${P}reinforced_glass`,
  // Move the radar to the middle of the new room with free space all round for upgrade modules.
  `setblock 85 ${G + 1} ${Z0 + 1} minecraft:air`,
  `setblock 92 ${G + 1} -808 ${P}radar`,
  ...[[89, -810], [95, -810], [89, -806], [95, -806]].map(([x, z]) => `setblock ${x} ${G + H} ${z} minecraft:lantern[hanging=true]`),
];
let fails = 0;
for (const s of steps) if (!(await cmd(s)).success) fails++;
console.log(`done, ${steps.length} steps, ${fails} failed`);
