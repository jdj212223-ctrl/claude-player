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
