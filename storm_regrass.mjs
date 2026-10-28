// Heals tornado tracks round the storm home: in a 181x181 area centred on the house, every dirt and PMWeather
// scouring/charred/scoured block between y 56 and 85 becomes grass again, and the tornado debris plants go.
// Buried dirt turned to grass just reverts on its own, so 1-block-high slabs of fill ... replace are enough.
async function cmd(command) {
  const res = await (await fetch("http://127.0.0.1:25601", { method: "POST", body: JSON.stringify({ tool: "run_command", args: { command }, target: "host" }) })).json();
  return JSON.parse(res.content?.[0]?.text ?? "{}");
}
const CX = 86, CZ = -808, R = 90;
const bad = ["minecraft:dirt", "minecraft:coarse_dirt", "pmweather:medium_scouring", "pmweather:heavy_scouring", "pmweather:scoured_grass",
  "pmweather:charred_dirt", "pmweather:charred_dirt_slight", "pmweather:smoldering_dirt", "pmweather:smoldering_dirt_slight"];
let changed = 0;
for (let y = 56; y <= 85; y++) {
  for (const b of bad) {
    const r = await cmd(`fill ${CX - R} ${y} ${CZ - R} ${CX + R} ${y} ${CZ + R} minecraft:grass_block replace ${b}`);
    const m = (r.output ?? []).join(" ").match(/filled (\d+)/i); if (m) changed += +m[1];
  }
  for (const p of ["pmweather:plants", "pmweather:plants2", "pmweather:plants3"]) {
    const r = await cmd(`fill ${CX - R} ${y} ${CZ - R} ${CX + R} ${y} ${CZ + R} minecraft:air replace ${p}`);
    const m = (r.output ?? []).join(" ").match(/filled (\d+)/i); if (m) changed += +m[1];
  }
}
console.log(`done, ${changed} blocks healed`);
