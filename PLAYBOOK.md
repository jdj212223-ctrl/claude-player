# Playing as "claude" (bot 2.0)

Start: the user opens the world to LAN ("Offline Mode + UUID Fix") and says the port, then
`./start.sh <port>` (client + `daemon.mjs` + `buddy.mjs`), and run `node ears.mjs` under Monitor.

Every time ears wakes you:

1. **Usage first.** Call `get_usage`. If the 5-hour limit is at 85% or more (or weekly at 95%+), turn on
   LIMIT SAFER: `echo on > limit.mode`, `node talk.mjs "Limit safer on, I'm going quiet. Say claude limit safer off to wake me."`,
   then stop. While it is on, ears only wakes you for "claude limit safer off" / "claude wake up"
   (then `echo off > limit.mode`).
2. **Look before acting.** `node status.mjs`: position, hp/food, the slot in hand ("EMPTY HAND" means do not place),
   hotbar, backpack, crosshair, who is in view. Take a `screenshot` only when the text is not enough.
3. **Answer with `node talk.mjs "..."`.** It shows in everyone's chat as `[claude] ...` (tellraw through the host, so the
   host does not hide it) and speaks it out loud. Keep replies short.

Free things (no Claude usage): `buddy.mjs` follows (`echo "follow jdj125" > buddy.mode`, `off` to stop) and respawns
with "wake up" after a death (never "stay": that quits to the title screen).

Host-side actions (tp, noclip, heal, give) go through the daemon's `host` target or the user's `minecraft` MCP server,
only when the user asks. Never chop oak near the village (its houses are oak). Builders check the held item first.

## Storm chasing (Interceptors + ProtoManly's Weather)

Tornadoes kill fast. Inside the wind field PMWeather lifts and flings anything standing outside, so:

- **Never stand outside near a tornado.** Turn buddy off (`echo off > buddy.mode`) when one is close: walking after the
  user can put you in the wind. Ride in an interceptor, seated, and stay seated.
- **Read the storm first.** Use a screen (dashboard, rugged laptop, iPad): nearest tornado, distance, direction, wind,
  stage. Call it out to the driver: "Tornado 500 m northwest, 160 mph, coming at us."
- **Drop anchor early.** Watch the DROP ANCHOR panel (top right): STANDBY (yellow) → READY (green) → anchored. ERROR
  (red) or a frozen anchor computer means the anchors won't go down: reboot it, or back off right away.
- **Broken glass is deadly.** Failed windows let wind and debris in: above 80 mph everyone inside keeps taking damage
  (it's what cut Reed Timmer's face in the Dom 1 at Aurora, 2009). Hail cracks them. If the windows show as failed,
  tell the driver and get out of the core.
- **Other failures:** dirt in the hydraulics (mud, debris, soft ground) stops the skirts and anchors; tires, engine and
  instruments can fail too. A wrecked interceptor means the rental car: no armour, never into the core.
- **Never trust "it'll hold".** If health is dropping or the anchor shows ERROR, say so out loud and back off. Better
  stranded than "taken".
