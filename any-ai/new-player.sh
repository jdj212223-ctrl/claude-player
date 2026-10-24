#!/bin/sh
# Makes the game folder for another AI player with its own body in the world, like Claude's.
# Usage: any-ai/new-player.sh <name> [bridge-port]   (then: PLAYER=<name> ./start.sh <lan-port>)
# It shares Claude's mods and copies its settings, with its own MCPFabric bridge port and a new secret token.
set -e
cd "$(dirname "$0")/.."
NAME="$1"; PORT="${2:-25602}"
[ -n "$NAME" ] && [ "$NAME" != claude ] || { echo "usage: any-ai/new-player.sh <name> [bridge-port]"; exit 1; }
DIR="run-$NAME"
mkdir -p "$DIR"
# A real copy of the mods, not a shortcut: Essential does not start from a linked folder. (cp -c clones on APFS: no extra space.)
[ -e "$DIR/mods" ] || { mkdir "$DIR/mods"; cp -c run/mods/*.jar "$DIR/mods/" 2>/dev/null || cp run/mods/*.jar "$DIR/mods/"; }
# Essential, already set up: the host's Essential kicks players whose Essential isn't ready ("Invalid player data").
[ -d "$DIR/essential" ] || [ ! -d run/essential ] || { cp -R run/essential "$DIR/essential"; rm -rf "$DIR"/essential/*cache* "$DIR"/essential/screenshot*; }
[ -d "$DIR/config" ] || cp -R run/config "$DIR/config"
for f in options.txt servers.dat; do [ -e "$DIR/$f" ] || [ ! -e "run/$f" ] || cp "run/$f" "$DIR/$f"; done
python3 - "$DIR/config/mcpfabric.config.json" "$PORT" <<'PY'
import json, secrets, sys
path, port = sys.argv[1], int(sys.argv[2])
cfg = json.load(open(path))
cfg.update(port=port, token=secrets.token_urlsafe(32))
cfg.pop("worldIdKey", None)
json.dump(cfg, open(path, "w"), indent=2)
PY
# A bot needs no pretty graphics or sound: keep it light so the Mac doesn't lag.
sed -i '' -e 's/^renderDistance:.*/renderDistance:2/' -e 's/^simulationDistance:.*/simulationDistance:5/' \
  -e 's/^maxFps:.*/maxFps:10/' -e 's/^mipmapLevels:.*/mipmapLevels:0/' -e 's/^entityShadows:.*/entityShadows:false/' \
  -e 's/^soundCategory_master:.*/soundCategory_master:0.0/' "$DIR/options.txt"
echo "made $DIR (bridge port $PORT, daemon port $((PORT + 1))). Start it with: PLAYER=$NAME ./start.sh <lan-port>"
