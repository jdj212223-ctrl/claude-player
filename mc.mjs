// Call one MCPFabric tool on Claude's own client through daemon.mjs: node mc.mjs <tool> '<json args>'
// Images are saved to shot.png next to this file.
import { writeFileSync } from "node:fs";
const dir = new URL(".", import.meta.url).pathname;
const [tool, args = "{}"] = process.argv.slice(2);
const res = await (await fetch("http://127.0.0.1:25601", { method: "POST", body: JSON.stringify({ tool, args: JSON.parse(args) }) })).json();
for (const c of res.content ?? []) {
  if (c.type === "image") { writeFileSync(dir + "shot.png", Buffer.from(c.data, "base64")); console.log("[image saved to shot.png]"); }
  else console.log(c.text);
}
