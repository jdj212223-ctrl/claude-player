# Playing as "claude" (bot 3.0)

Start: the user opens the world to LAN ("Offline Mode + UUID Fix") and says the port, then
`./start.sh <port>` (client + `daemon.mjs` + `buddy.mjs`), and run `node ears.mjs` under Monitor.

Every time ears wakes you:

1. **Usage first.** Call `get_usage`. The weekly limit is the scary one (running out locks you out for days), so turn on
   LIMIT SAFER when the 5-hour limit is at 85%+ **or the weekly limit is at 80%+**: `echo on > limit.mode`,
   `node talk.mjs "Limit safer on, my backup takes over now. Say claude limit safer off to wake me."`, then stop.
   The guardian then plays as claude right away (a local model if one fits in memory, else autopilot). While it is on,
   ears only wakes you for "claude limit safer off" / "claude wake up" (then `echo off > limit.mode`).
   **News first:** if `run/guardian-report.txt` exists, read it (what the guardian did while you were away: a stand-in
   played, a brain crashed, memory ran low), tell the user in one short line, then
   `mv run/guardian-report.txt run/guardian-report.read.txt`.
2. **Look before acting.** `node status.mjs`: position, hp/food, the slot in hand ("EMPTY HAND" means do not place),
   hotbar, backpack, crosshair, who is in view. Take a `screenshot` only when the text is not enough.
3. **Answer with `node talk.mjs "..."`.** It shows in everyone's chat as `[claude] ...` (tellraw through the host, so the
   host does not hide it) and speaks it out loud. Keep replies short.

Free things (no Claude usage): `buddy.mjs` follows (`echo "follow jdj125" > buddy.mode`, `off` to stop) and respawns
with "wake up" after a death (never "stay": that quits to the title screen).

Host-side actions (tp, noclip, heal, give) go through the daemon's `host` target or the user's `minecraft` MCP server,
only when the user asks. Never chop oak near the village (its houses are oak). Builders check the held item first.

## The guardian (bot 3.0)
`guardian.mjs` (started by start.sh, one per computer) checks every 10 s. Settings are in `guardian.json`:
- **Memory limits** (`limitsGB`, per player): a brain over its limit is stopped by PID, its Ollama model is taken out
  of memory, and `autopilot.mjs` plays for it (follow/stop/status/where, plus buddy's drinking, sleeping, warming).
- **Crash / out of memory:** agent.mjs keeps a card in `run*/brain.json`; a brain that dies or hits Ollama's "out of
  memory" error gets autopilot too. Starting the brain again stops autopilot by itself.
- **Low memory** (under `lowMemoryGB`): idle Ollama models leave memory. Ollama started by the guardian uses
  memory-saving settings (1 model, 1 chat, 8-bit cache). It never kills other apps or changes system settings.
- **Claude away** (LIMIT SAFER on, ears off, or no answer within `claudeNoAnswerSeconds` after a wake): stand-in.
  Your own replies (talk.mjs without BOT_STANDIN) mark you as back, and the stand-in stops.
- Every event goes in that AI's `guardian-report.txt` and in `guardian.log`. `AI_MODEL=auto` picks the biggest
  model that fits.

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

## Cold Sweat, Primal Winter and the Victus world
- The user's Victus laptop hosts a separate survival world they LIVE STREAM: no cheats, no commands, short clean chat.
- Cold Sweat: the world is always freezing (Primal Winter). Body temperature is in run/coldsweat.json (body < -40 =
  getting cold, around -100 you freeze and take damage) plus the nearest heat source within 12 blocks. buddy.mjs
  walks to that heat source by itself when cold and follows again once warm.
- Staying warm, legit: stand near a lit campfire, furnace, fire or a Cold Sweat Hearth (it fills a closed room with
  warm air; fuel it with coal/lava). Wear fur/wool/leather armor, or insulate armor at the Sewing Table. Solid doors
  keep Hearth air in; doors with holes (oak, acacia, jungle, iron, copper, bamboo, cherry) leak it (Drafty Doors).
- Rotten flesh smelts into leather (mod in the pack), so zombies at night = leather for warm armor.

## The user's own mods (and Vampirism)
- Chromeflesh (cyberware): implants for every organ, no humanity limit, everything stacks. Claws on J
  (keys.txt: key.chromeflesh.claws). HUDjack hacks cyberhumans; a defibrillator revives you once.
- Nightvein (vampires): you turn someone by biting their neck (keys.txt: key.nightvein.bite). The sun burns but is
  survivable, so stay in shade or indoors by day. Bloodrush (with Chromeflesh) drains blood fast, and running dry
  crashes you, so drink first.
- Vampirism (someone else's mod, if a world has it): also hates sunlight and garlic, and needs blood. Don't mix up its
  keys with Nightvein's; check Controls first.
- Interceptors: see "Storm chasing" above.

## Screens
- Scroll a list, JEI page or book: write "scroll x y amount" to run/mouse.txt (GUI coords from get_ui; positive
  amount = up, negative = down). Clicks are "x y [button]", keys are "key <name>".
- Chat on worlds hosted elsewhere is normal unsigned "<claude>" chat. The host only sees it if their game shows
  "Not Secure" chat and claude isn't hidden under Social Interactions (P). tellraw only works on the Mac's own world.

## Realism mod (the user's): staying alive
- run/coldsweat.json "realism" has thirst/awake (0..1 of the way to death), stamina, blood (liters) and injury bits;
  "water"/"bed" are the nearest drinkable water and bed, "night" whether beds work.
- buddy.mjs drinks on its own once thirst >= 0.33 (water bottle in the hotbar, or crouch in water with an empty
  hand) and sleeps in the nearest bed at night once awake >= 0.27. With no water around it asks the user for bottles.
- Bleeding: bandage (light/heavy), tourniquet (severe). Blood types matter for blood bags.
- Rescue (dormant until Realism 0.5.0): a player in players.json with pose SLEEPING and inBed false has collapsed.
  With a realism:defibrillator in the hotbar, buddy.mjs runs over, looks at them and presses
  key.realism.defib_charge → defib_clear → defib_shock (Q, W, E), 1.5 s apart.
