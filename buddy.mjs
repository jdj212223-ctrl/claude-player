// Claude's "buddy" behaviour: respawns after dying, follows a player around (walking, sprinting to catch up) and, when close, turns its
// head smoothly to look at them, glancing around now and then. Write "follow <name>" or "off" to buddy.mode to steer it;
// "off" leaves movement free for jobs and manual control.
import { readFileSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { DAEMON, MODE, NAME, RUN } from "./player.mjs";
const dir = new URL(".", import.meta.url).pathname;
const NEAR = 4, SPRINT_AT = 12, TURN = 14; // blocks, blocks, degrees per step

async function call(tool, args = {}, target = "me") {
  const res = await (await fetch(DAEMON, { method: "POST", body: JSON.stringify({ tool, args, target }) })).json();
  const text = res.content?.[0]?.text ?? "";
  try { return JSON.parse(text); } catch { return text; }
}
const mode = () => { try { return readFileSync(MODE, "utf8").trim().split(/\s+/); } catch { return ["off"]; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const wrap = a => ((a + 540) % 360) - 180;

// Skin per dimension (skin/skins.json): the normal one outside, sculk-corrupted in the Backrooms. Set through the
// host's SkinRestorer whenever Claude changes dimension; other dimensions use the overworld skin.
const skinFor = dim => {
  try { const s = JSON.parse(readFileSync(dir + "skin/skins.json", "utf8")); return s[dim] || s["minecraft:overworld"]; }
  catch { return null; }
};
let skinDim = null, farSince = 0, warming = false, needsUntil = 0, lastNeedSaid = 0;
const wait = ms => new Promise(r => setTimeout(r, ms));
const sayOnce = (text, everyMs = 120000) => {
  if (Date.now() - lastNeedSaid < everyMs) return;
  lastNeedSaid = Date.now();
  spawn("node", [dir + "talk.mjs", text], { stdio: "ignore", env: { ...process.env, BOT_STANDIN: "1" } });
};

// Drink: a water bottle from the hotbar if there is one, else crouch in nearby water with an empty hand (that's how
// the Realism mod lets you drink from water). Returns true if it did something this round.
async function drink(me, sense) {
  const inv = await call("get_inventory").catch(() => null);
  const items = Array.isArray(inv?.items) ? inv.items : Array.isArray(inv) ? inv : [];
  const bottle = items.find(i => i.slot >= 0 && i.slot <= 8 && /potion/.test(i.id ?? "") && /water/i.test(JSON.stringify(i)));
  if (bottle) {
    await call("select_hotbar_slot", { slot: bottle.slot });
    await call("start_using_item", {});
    await wait(1900);
    await call("stop_using_item", {});
    sayOnce("glug glug 💧 much better", 20000);
    return true;
  }
  if (sense.water) {
    const w = sense.water;
    if (Math.hypot(w.x + 0.5 - me.x, w.z + 0.5 - me.z) > 1.2) {
      await call("navigate_to", { x: w.x, y: w.y, z: w.z, reachRadius: 1, timeoutSeconds: 12 }).catch(() => {});
      return true;
    }
    const empty = [0, 1, 2, 3, 4, 5, 6, 7, 8].find(s => !items.some(i => i.slot === s));
    if (empty !== undefined) await call("select_hotbar_slot", { slot: empty });
    await call("set_movement", { sneak: true });
    await wait(4000);
    await call("set_movement", { sneak: false });
    sayOnce("drinking from the water 💧", 20000);
    return true;
  }
  sayOnce("I'm getting thirsty 💧 got any water bottles?");
  needsUntil = Date.now() + 30000;
  return false;
}

// Sleep: walk to the nearest bed at night, lie down long enough to count as rested (about 5 s), then get up.
// Rescue (Realism 0.5.0): a player lying down outside a bed has collapsed. If Claude carries a defibrillator in its
// hotbar, run over and use it with the mod's charge → clear → shock keys (Q, W, E). Asleep until 0.5.0 exists:
// without a realism:defibrillator in the hotbar this never does anything.
const DEFIB_KEYS = ["key.realism.defib_charge", "key.realism.defib_clear", "key.realism.defib_shock"];
let lastRescue = 0;
// The alarm: Realism shouts "<name> COLLAPSED!" to everyone nearby. Seeing it in chat makes Claude go for that
// player right away (sprinting), even before they show up lying down in render range.
let alarm = null, lastAlarmCheck = 0, lastAlarmId = -1;
async function checkAlarm() {
  if (Date.now() - lastAlarmCheck < 1000) return;
  lastAlarmCheck = Date.now();
  const chat = await call("get_recent_chat", { limit: 8 }).catch(() => null);
  for (const m of chat?.messages ?? []) {
    if (m.id <= lastAlarmId) continue;
    lastAlarmId = m.id;
    const name = (m.data?.text ?? "").match(/^(\S+) COLLAPSED!/)?.[1];
    if (name && name !== NAME) {
      alarm = { name, at: Date.now() };
      sayOnce(`on my way ${name}! ⚡🏃`, 3000);
      // With a phone (and signal), call the ambulance straight away (Realism 0.8.2+): faster than any running.
      const inv = await call("get_inventory").catch(() => null);
      const items = Array.isArray(inv?.items) ? inv.items : Array.isArray(inv) ? inv : [];
      if (items.some(i => (i.id ?? "").includes("realism:phone"))) await call("send_chat", { message: "/ambulance" }).catch(() => {});
    }
  }
}

async function rescue(me) {
  await checkAlarm();
  if (alarm && Date.now() - alarm.at > 120000) alarm = null;
  if (!alarm && Date.now() - lastRescue < 15000) return false;
  let players = [];
  try { players = JSON.parse(readFileSync(RUN + "players.json", "utf8")); } catch { return false; }
  const down = players.find(q => (q.pose === "SLEEPING" && !q.inBed) || (alarm && q.name === alarm.name));
  if (!down) return false;
  const inv = await call("get_inventory").catch(() => null);
  const items = Array.isArray(inv?.items) ? inv.items : Array.isArray(inv) ? inv : [];
  const defib = items.find(i => i.slot >= 0 && i.slot <= 8 && (i.id ?? "").includes("realism:defibrillator"));
  if (!defib) return false;
  if (Math.hypot(down.x - me.x, down.z - me.z) > 2.5) {
    if (Date.now() - navigatingSince > 1200) {
      await call("navigate_to", { x: down.x, y: down.y, z: down.z, reachRadius: 2, sprint: true, timeoutSeconds: 10 }).catch(() => {});
      navigatingSince = Date.now();
    }
    return true;
  }
  sayOnce(`hang on ${down.name}! ⚡ defibrillator`, 5000);
  await call("select_hotbar_slot", { slot: defib.slot });
  await call("look_at", { x: down.x, y: down.y + 0.3, z: down.z });
  for (const key of DEFIB_KEYS) {
    writeFileSync(RUN + "keys.txt", key + "\n");
    await wait(1500); // charge, then everyone clear, then shock
  }
  lastRescue = Date.now();
  alarm = null;
  return true;
}

async function sleepIn(bed) {
  const me = await call("get_self");
  if (Math.hypot(bed.x + 0.5 - me.x, bed.z + 0.5 - me.z) > 2.5) {
    await call("navigate_to", { x: bed.x, y: bed.y, z: bed.z, reachRadius: 2, timeoutSeconds: 12 }).catch(() => {});
    return true;
  }
  await call("look_at", { x: bed.x + 0.5, y: bed.y + 0.3, z: bed.z + 0.5 });
  await call("use_item", {}).catch(() => {});
  sayOnce("so tired 😴 sleeping for a bit", 20000);
  await wait(7000);
  await call("close_screen").catch(() => {}); // "Leave Bed"
  needsUntil = Date.now() + 60000;
  return true;
}
// Out-of-office reply: Claude only hears chat while ears.mjs runs under its Monitor, which the app stops every 30 min
// and which is gone whenever the Claude app is closed. ears.mjs touches ears.alive each loop; when someone says "claude"
// and that is over 15 s old, answer in game so they know to ping Claude in the app instead of waiting.
const fresh = file => { try { return Date.now() - Number(readFileSync(RUN + file, "utf8")) < 15000; } catch { return false; } };
const earsAlive = () => fresh("ears.alive") || fresh("backup.alive"); // Claude, or backup.mjs's stand-in brain
let lastChat = -1, lastAway = 0, lastChatCheck = 0;
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
        if (NAME === "claude" && url && url !== skinFor(skinDim)) await call("run_command", { command: `skin set web classic "${url}" ${NAME}` }, "host");
        skinDim = self.dimension;
      }
    } catch {}
  }
  if (NAME === "claude" && Date.now() - lastChatCheck > 3000) {
    lastChatCheck = Date.now();
    try {
      const { messages = [] } = await call("get_recent_chat", { limit: 30 });
      if (messages.length && Math.max(...messages.map(msg => msg.id)) < lastChat) lastChat = -1; // client restarted
      for (const msg of messages) {
        if (lastChat >= 0 && msg.id > lastChat && msg.type === "chat" && msg.data?.sender !== NAME && /claude/i.test(msg.data?.text ?? "")
            && !earsAlive() && Date.now() - lastAway > 60000) {
          lastAway = Date.now();
          const reply = JSON.stringify({ text: "[claude] I'm not listening right now 😴 Ping me in the Claude app and I'll be right back!" });
          await call("run_command", { command: `tellraw @a ${reply}` }, "host");
        }
      }
      if (messages.length) lastChat = Math.max(lastChat, ...messages.map(msg => msg.id));
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
    // Cold Sweat: when Claude's body gets cold, go warm up at the nearest heat source ColdSense found (campfire,
    // Hearth, furnace...) instead of following; say so once, and follow again once warm.
    let cold = null;
    try { cold = JSON.parse(readFileSync(RUN + "coldsweat.json", "utf8")); } catch {}
    if (cold && typeof cold.body === "number" && cold.body < (warming ? -10 : -40)) {
      if (!warming) { warming = true; spawn("node", [dir + "talk.mjs", "brr I'm freezing 🥶 warming up by the fire"], { stdio: "ignore", env: { ...process.env, BOT_STANDIN: "1" } }); }
      if (cold.heat && Math.hypot(cold.heat.x + 0.5 - me.x, cold.heat.z + 0.5 - me.z) > 3.5 && Date.now() - navigatingSince > 1500) {
        await call("navigate_to", { x: cold.heat.x, y: cold.heat.y, z: cold.heat.z, reachRadius: 3, sprint: false, timeoutSeconds: 10 });
        navigatingSince = Date.now();
      }
      if (cold.heat) continue;
    } else if (warming) warming = false;
    // Saving a collapsed friend comes before anything else.
    if (await rescue(me)) continue;
    // The user's Realism mod: drink when thirsty and sleep when tired at night, the legit way (no commands).
    const body = cold?.realism;
    if (body && Date.now() > needsUntil) {
      if (body.thirst >= 0.33 && await drink(me, cold)) continue;
      if (body.awake >= 0.27 && cold.night && cold.bed && await sleepIn(cold.bed)) continue;
    }
    // Ask the host where they are: works through walls and behind Claude, unlike what Claude can see. On a LAN world
    // hosted on another computer there is no host bridge, so fall back to the players the client sees (PlayerSpotter);
    // there Claude can't teleport either, so it only walks.
    let p = await call("get_player", { player: who }, "host").catch(() => null);
    const viaHost = typeof p === "object" && p !== null;
    if (!viaHost) {
      try { p = JSON.parse(readFileSync(RUN + "players.json", "utf8")).find(q => q.name === who); } catch { p = null; }
    }
    if (!p) continue;
    if (!viaHost) {
      const dist = Math.hypot(p.x - me.x, p.z - me.z);
      if (dist > NEAR + 1 && Date.now() - navigatingSince > 1500) {
        await call("navigate_to", { x: p.x, y: p.y, z: p.z, reachRadius: NEAR - 1, sprint: dist > SPRINT_AT, timeoutSeconds: 10 });
        navigatingSince = Date.now();
        continue;
      }
      if (dist > NEAR + 1) continue;
    }
    // Noclip scatters players across the Backrooms: too far to walk, so catch up with a teleport.
    if (p.dimension !== me.dimension || Math.hypot(p.x - me.x, p.z - me.z) > 64) {
      await call("run_command", { command: `tp ${NAME} ${who}` }, "host");
      await sleep(1500);
      continue;
    }
    const them = { pos: { x: p.x, y: p.y, z: p.z } };
    const dx = them.pos.x - me.x, dy = them.pos.y + 1.5 - (me.y + 1.62), dz = them.pos.z - me.z;
    const dist = Math.hypot(dx, dz);
    // Walls the walker cannot get round (mazes, closed rooms): if still far after 6 s, teleport.
    if (dist > 10) { if (!farSince) farSince = Date.now(); } else farSince = 0;
    if (farSince && Date.now() - farSince > 6000) {
      await call("run_command", { command: `tp ${NAME} ${who}` }, "host");
      farSince = 0;
      continue;
    }
    // The Nether is lava lakes and cliffs the walker steps straight into: never walk there, just appear where they
    // stand (they only stand on safe ground) once they are a few blocks off.
    if (me.dimension === "minecraft:the_nether") {
      if (navigatingSince) { await call("stop_navigation"); navigatingSince = 0; }
      if (dist > NEAR + 2 && !me.inLava) { await call("run_command", { command: `tp ${NAME} ${who}` }, "host"); await sleep(800); continue; }
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
