// Takes down the 5x5 hut built by build_hut.mjs (same arguments), breaking only its plank blocks, roof first.
const [X0, G, Z0] = process.argv.slice(2).map(Number);
const X1 = X0 + 4, Z1 = Z0 + 4;
async function call(tool, args = {}) {
  const res = await (await fetch("http://127.0.0.1:25601", { method: "POST", body: JSON.stringify({ tool, args }) })).json();
  const text = res.content?.[0]?.text ?? "";
  try { return JSON.parse(text); } catch { return text; }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const inv = await call("get_inventory");
const axe = inv.hotbar.find(i => i.id.endsWith("_axe"))?.slot;
if (axe !== undefined) await call("select_hotbar_slot", { slot: axe });
const targets = [];
for (let y = G + 4; y >= G + 1; y--)
  for (let x = X0; x <= X1; x++)
    for (let z = Z0; z <= Z1; z++)
      if (y === G + 4 || x === X0 || x === X1 || z === Z0 || z === Z1) targets.push([x, y, z]);
let broke = 0;
for (const [x, y, z] of targets) {
  // Claude's client has no server to read blocks from, so just mine each spot; empty ones end at once.
  const r = await call("break_block", { x, y, z, mode: "survival" });
  if (typeof r === "object" && r.ok !== false) { broke++; await sleep(1600); }
}
console.log("broke", broke);
