// Keeps every Dom 3 at full health for a while (hail wears the windows down fast): repairs all parts every 5 s for
// MINUTES (default 10), then stops.
const end = Date.now() + 60000 * +(process.env.MINUTES ?? 10);
const fix = "execute as @e[type=interceptors:dominator_3] run data merge entity @s " +
  "{Damage:0.0f,Grime:0.0f,Frozen:0b,Parts:{computer:100,engine:100,hydraulics:100,windows:100,tires:100}}";
while (Date.now() < end) {
  try { await fetch("http://127.0.0.1:25601", { method: "POST", body: JSON.stringify({ tool: "run_command", args: { command: fix }, target: "host" }) }); } catch {}
  await new Promise(r => setTimeout(r, 5000));
}
