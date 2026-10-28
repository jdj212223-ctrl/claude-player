// Calls out the tornado while Claude rides along in an Interceptors vehicle: every 8 s it screenshots, reads the dash
// HUD with tools/ocr (macOS Vision) and, when a tornado shows up or its distance crosses a 250 m step, says it in
// chat ("EF2 tornado 1200 m SE"). Prints each call-out too, so a Monitor sees them.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const run = promisify(execFile);
const dir = new URL(".", import.meta.url).pathname;
let lastStep = null, gone = true;
for (;;) {
  try {
    await run("node", [dir + "mc.mjs", "screenshot", "{}"], { cwd: dir });
    const { stdout } = await run(dir + "tools/ocr", [dir + "shot.png"]);
    // The distance is "1332 m W"; OCR sometimes reads the m as Cyrillic "м" and must not take "169 mph" for metres.
    const m = stdout.match(/(EF\d|TORNADO)[\s\S]*?(\d{2,5})\s*[mм]\s+([NSEW]{1,2})\b/i);
    if (m) {
      const dist = +m[2], step = Math.floor(dist / 250);
      const ef = (stdout.match(/EF\d/i) ?? ["Tornado"])[0].toUpperCase();
      if (gone || step !== lastStep) {
        const msg = `${ef} tornado ${dist} m ${m[3].toUpperCase()}${dist < 300 ? " ⚠️ CLOSE! Anchor soon!" : ""}`;
        console.log(`🌪️ ${msg}`);
        await run("node", [dir + "talk.mjs", `📡 ${msg}`], { cwd: dir });
        lastStep = step; gone = false;
      }
    } else if (!gone && /No tornado/i.test(stdout)) {
      console.log("🌪️ tornado gone from the dash"); gone = true; lastStep = null;
    }
  } catch { /* not riding, or client busy */ }
  await new Promise(r => setTimeout(r, 8000));
}
