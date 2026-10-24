// A short text snapshot of Claude's situation, cheap enough to check before every action:
// where it is, health and food, what is in its hand and hotbar, effects on it, what it is looking at, and who is nearby.
import { DAEMON } from "./player.mjs";
async function call(tool, args = {}) {
  const res = await (await fetch(DAEMON, { method: "POST", body: JSON.stringify({ tool, args }) })).json();
  const text = res.content?.[0]?.text ?? "";
  try { return JSON.parse(text); } catch { return text; }
}
const short = id => (id ?? "").replace(/^minecraft:/, "");
const screen = await call("get_screen");
if (!screen?.inWorld) { console.log("not in a world: screen", screen?.screen ?? screen); process.exit(0); }
const [me, inv, scene, fx, gear] = [await call("get_self"), await call("get_inventory"), await call("describe_scene", { rayColumns: 1, rayRows: 1, maxDistance: 32 }), await call("get_status_effects"), await call("get_equipment")];
const held = inv.hotbar.find(i => i.slot === inv.selectedSlot);
console.log(`at ${Math.round(me.x)} ${Math.round(me.y)} ${Math.round(me.z)} in ${short(me.dimension)} | hp ${Math.round(me.health)}/20 food ${me.food}/20 | screen ${screen.screen}`);
console.log(`holding slot ${inv.selectedSlot}: ${held ? `${short(held.id)} x${held.count}` : "EMPTY HAND"}`);
console.log("hotbar: " + (inv.hotbar.map(i => `${i.slot}:${short(i.id)}x${i.count}`).join(" ") || "empty"));
if (inv.main.length) console.log("backpack: " + inv.main.map(i => `${short(i.id)}x${i.count}`).join(" "));
const worn = ["helmet", "chest", "legs", "boots", "offHand"].filter(k => gear?.[k]?.id).map(k => `${k}: ${short(gear[k].id)}`);
console.log("wearing: " + (worn.join(", ") || "nothing"));
const effects = (fx?.effects ?? []).map(e => short(e.id) + (e.amplifier ? " " + (e.amplifier + 1) : ""));
if (effects.length) console.log("effects: " + effects.join(", "));
const look = scene?.lookingAt;
if (look && look.type !== "none") console.log(`looking at: ${look.type === "entity" ? look.name : short(look.id)}`);
const near = (scene?.entities ?? []).map(e => `${e.name ?? short(e.type)} ${Math.round(e.distance)}m`);
console.log("in view: " + (near.join(", ") || "nobody"));
