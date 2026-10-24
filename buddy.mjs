// Claude's "buddy" behaviour: respawns after dying, follows a player around (walking, sprinting to catch up) and, when close, turns its
// head smoothly to look at them, glancing around now and then. Write "follow <name>" or "off" to buddy.mode to steer it;
// "off" leaves movement free for jobs and manual control.
import { readFileSync } from "node:fs";
const dir = new URL(".", import.meta.url).pathname;
const NEAR = 4, SPRINT_AT = 12, TURN = 14; // blocks, blocks, degrees per step

async function call(tool, args = {}, target = "me") {
  const res = await (await fetch("http://127.0.0.1:25601", { method: "POST", body: JSON.stringify({ tool, args, target }) })).json();
  const text = res.content?.[0]?.text ?? "";
  try { return JSON.parse(text); } catch { return text; }
}
const mode = () => { try { return readFileSync(dir + "buddy.mode", "utf8").trim().split(/\s+/); } catch { return ["off"]; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const wrap = a => ((a + 540) % 360) - 180;

// Skin per dimension (skin/skins.json): the normal one outside, sculk-corrupted in the Backrooms. Set through the
// host's SkinRestorer whenever Claude changes dimension; other dimensions use the overworld skin.
const skinFor = dim => {
  try { const s = JSON.parse(readFileSync(dir + "skin/skins.json", "utf8")); return s[dim] || s["minecraft:overworld"]; }
  catch { return null; }
};
let skinDim = null, farSince = 0;
let lastDeathCheck = 0, lastScreenCheck = 0, navigatingSince = 0, glanceUntil = 0, glanceYaw = 0, nextGlance = Date.now() + 6000, wasOn = false;
for (;;) {
  await sleep(150);
  // Respawn by itself whatever the mode: VoidClip's death screen has "wake up" (respawn) and "stay" (quit). Never "stay".
  if (Date.now() - lastDeathCheck > 1500) {
    lastDeathCheck = Date.now();
    try {
      const self = await call("get_self");
      if (typeof self === "object" && self.health <= 0) { await sleep(2200); await call("click_widget", { widget: "wake up" }); }
      if (typeof self === "object" && self.dimension && self.dimension !== skinDim) {
        const url = skinFor(self.dimension);
        if (url && url !== skinFor(skinDim)) await call("run_command", { command: `skin set web classic "${url}" claude` }, "host");
        skinDim = self.dimension;
      }
    } catch {}
  }
  const [m, who = "jdj125"] = mode();
  if (m !== "follow") {
    if (wasOn) { await call("stop_navigation").catch(() => {}); await call("stop_movement").catch(() => {}); wasOn = false; }
    continue;
  }
  wasOn = true;
  try {
    // A chat box or pause menu left open blocks all movement; close it.
    if (Date.now() - lastScreenCheck > 2000) {
      lastScreenCheck = Date.now();
      const screen = await call("get_screen");
      if (screen?.screen === "chat" || screen?.screen === "pause") await call("close_screen");
    }
    const me = await call("get_self");
    if (typeof me !== "object" || me.health <= 0) continue;
    // Ask the host where they are: works through walls and behind Claude, unlike what Claude can see.
    const p = await call("get_player", { player: who }, "host");
    if (typeof p !== "object") continue;
    // Noclip scatters players across the Backrooms: too far to walk, so catch up with a teleport.
    if (p.dimension !== me.dimension || Math.hypot(p.x - me.x, p.z - me.z) > 64) {
      await call("run_command", { command: `tp claude ${who}` }, "host");
      await sleep(1500);
      continue;
    }
    const them = { pos: { x: p.x, y: p.y, z: p.z } };
    const dx = them.pos.x - me.x, dy = them.pos.y + 1.5 - (me.y + 1.62), dz = them.pos.z - me.z;
    const dist = Math.hypot(dx, dz);
    // Walls the walker cannot get round (mazes, closed rooms): if still far after 6 s, teleport.
    if (dist > 10) { if (!farSince) farSince = Date.now(); } else farSince = 0;
    if (farSince && Date.now() - farSince > 6000) {
      await call("run_command", { command: `tp claude ${who}` }, "host");
      farSince = 0;
      continue;
    }
    // The Nether is lava lakes and cliffs the walker steps straight into: never walk there, just appear where they
    // stand (they only stand on safe ground) once they are a few blocks off.
    if (me.dimension === "minecraft:the_nether") {
      if (navigatingSince) { await call("stop_navigation"); navigatingSince = 0; }
      if (dist > NEAR + 2 && !me.inLava) { await call("run_command", { command: `tp claude ${who}` }, "host"); await sleep(800); continue; }
    }
    if (dist > NEAR + 1 && me.dimension !== "minecraft:the_nether") {
      if (Date.now() - navigatingSince > 1500) {
        await call("navigate_to", { x: them.pos.x, y: them.pos.y, z: them.pos.z, reachRadius: NEAR - 1, sprint: dist > SPRINT_AT, timeoutSeconds: 10 });
        navigatingSince = Date.now();
      }
      continue;
    }
    if (navigatingSince) { await call("stop_navigation"); navigatingSince = 0; }
    // Close enough: look at them, easing the head round, with the odd glance away.
    const now = Date.now();
    if (now > nextGlance) { glanceYaw = (Math.random() - 0.5) * 140; glanceUntil = now + 900 + Math.random() * 1200; nextGlance = now + 5000 + Math.random() * 7000; }
    let yaw = Math.atan2(-dx, dz) * 180 / Math.PI, pitch = -Math.atan2(dy, dist) * 180 / Math.PI;
    if (now < glanceUntil) { yaw += glanceYaw; pitch = (Math.random() - 0.5) * 20; }
    const dYaw = Math.max(-TURN, Math.min(TURN, wrap(yaw - me.yaw)));
    const dPitch = Math.max(-TURN, Math.min(TURN, pitch - me.pitch));
    if (Math.abs(dYaw) > 0.5 || Math.abs(dPitch) > 0.5) await call("look", { deltaYaw: dYaw, deltaPitch: dPitch });
  } catch { await sleep(1000); }
}
