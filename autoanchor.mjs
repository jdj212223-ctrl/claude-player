// One-shot: reads the Interceptors dash every 2 s and drops the anchors once the tornado is closer than ANCHOR_AT
// metres (default 200), then says so and exits. For "get closer, then deploy" intercepts while someone else drives.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFileSync } from "node:fs";
const run = promisify(execFile);
const dir = new URL(".", import.meta.url).pathname;
const AT = +(process.env.ANCHOR_AT ?? 200);
for (;;) {
  try {
    await run("node", [dir + "mc.mjs", "screenshot", "{}"], { cwd: dir });
    const { stdout } = await run(dir + "tools/ocr", [dir + "shot.png"]);
    const m = stdout.match(/(EF\d|TORNADO)[\s\S]*?(\d{2,5})\s*[mм]\s+([NSEW]{1,2})/i);
    if (m && +m[2] < AT && /READY/i.test(stdout)) {
      writeFileSync(dir + "run/keys.txt", "key.interceptors.anchors\n");
      console.log(`⚓ anchors deploying, tornado ${m[2]} m ${m[3]}`);
      await run("node", [dir + "talk.mjs", `⚓ DEPLOYING ANCHORS! Tornado ${m[2]} m ${m[3]}. Hold on! 🌪️`], { cwd: dir });
      break;
    }
  } catch {}
  await new Promise(r => setTimeout(r, 2000));
}
