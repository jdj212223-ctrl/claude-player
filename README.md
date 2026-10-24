# claude-player

Let Claude join your Minecraft world as its **own player**: it walks around with you, hears you in
Simple Voice Chat, answers in chat and out loud, follows you, guards you, builds and loots.

Made by jdj125 with Claude, for playing the Backrooms mod VoidClip on NeoForge 1.21.1.
Built on [MCPFabric](https://github.com/denfry/mcpfabric) (MIT), which lets an AI control a Minecraft client over MCP.

## How it works

- A second Minecraft client (a NeoForge dev run from this Gradle project) joins your LAN world with the offline
  name `claude`. MCPFabric inside it opens a bridge on port 25600.
- `daemon.mjs` keeps MCP connections open: `me` (Claude's client) and `host` (your own game, through your
  MCPFabric bridge) for things like `tellraw` and teleports.
- `buddy.mjs` follows you, looks around and respawns after deaths. It runs locally and costs no AI usage.
- `claude_ears` (a small client mod in `src/`) saves what nearby players say in Simple Voice Chat as short WAVs.
  `ears.mjs` transcribes them with whisper.cpp and prints a line when someone says "claude", plus chat that
  mentions Claude. Run it under your agent's background monitor so each line wakes the agent. Clips are deleted
  right after transcription.
- `talk.mjs` posts `[claude] ...` in everyone's chat and says it out loud in Simple Voice Chat: it queues the line in
  `run/voice.txt`, and the mod's `Mouth` speaks it with macOS `say` (48 kHz PCM) and merges it into Claude's outgoing
  voice chat audio, so it comes from Claude's character. The client's own mic stays on push-to-talk with gain 0, so
  a microphone shared with your game is never sent. Holding a Simple Radio transceiver, it also keys the radio.
- `KeyPresser` (in the mod) presses any key binding named in `run/keys.txt`, including other mods' (Chromeflesh
  claws and HUDjack, Nightvein bite). It clicks only that binding, so two mods sharing a key don't both fire.
- `status.mjs` prints a cheap text snapshot (position, health, held item, hotbar, crosshair, who is near).
- Extras: `guard.mjs` (guard a player, raiders included), `hunt_raid.mjs` (hunt every raider of a raid),
  `watch.mjs` (stare down look-to-freeze monsters), `loot_carts.mjs`, `build_house.mjs`. In the Nether `buddy.mjs`
  never walks (lava); it teleports to where you stand.
- Base building on our world: `dig_basement.mjs` and `mine_stone.mjs` dig by hand; `build_bar.mjs`,
  `move_bar_stairs.mjs` and `fix_bar_stairs.mjs` finished the basement tavern with commands (`line_basement.mjs` and
  `fill_cave.mjs` were the block-by-block attempts the cave under the floor defeated).
- Rules for the agent are in [PLAYBOOK.md](PLAYBOOK.md), including LIMIT SAFER (go quiet when usage runs low).
- Other AIs (GitHub Copilot, Codex, ChatGPT's and Mistral's models, local Ollama models) can be the brain too: see
  [any-ai/](any-ai/README.md).

## Setup

1. Clone [MCPFabric](https://github.com/denfry/mcpfabric) next to this folder (or set `MCPFABRIC_DIR`) and build
   its `mcp-server` (`npm install && npm run build`). Install MCPFabric in your own game too.
2. Copy the mod jars from your instance into `run/mods/` (everything that adds content; client-only visual mods
   are optional). `build.gradle` compiles against `run/mods/voicechat-neoforge-1.21.1-2.6.25.jar`.
3. Copy `mcpfabric.config.example.json` to `run/config/mcpfabric.config.json` and set a long random token.
4. For voice: `brew install whisper-cpp` and download `ggml-base.en.bin` from
   https://huggingface.co/ggerganov/whisper.cpp into `models/`.
5. In your game, open the world to LAN with offline mode allowed (e.g. the LAN Server Properties mod,
   "Offline Mode + UUID Fix"), then run `./start.sh <lan-port>`.
6. Optional skin: SkinRestorer on the host and `/skin set web classic <texture url> claude`
   (`skin/make_skin.py` draws the default one).

`HOST_MCP` can point to the command that starts an MCP server for your own game; by default it is
`$MCPFABRIC_DIR/run-mcp.sh`, which should read your game's token itself. Never commit tokens: `run/` is ignored.

macOS only for now (`say`, Homebrew paths). License: MIT.
