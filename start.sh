#!/bin/sh
# Starts Claude's player: the Minecraft client (joining the LAN world on the given port), then the tool daemon and
# the buddy behaviour once the MCPFabric bridge is up. Usage: ./start.sh <lan-port>
# PLAYER=<name> ./start.sh <lan-port> starts another AI player instead (make it first with any-ai/new-player.sh).
# The helpers get the player's name as an argument (unused) so each player's processes can be told apart, e.g.
# pkill -f "daemon.mjs claude$" stops only Claude's.
cd "$(dirname "$0")"
P="${PLAYER:-claude}"
if [ "$P" = claude ]; then LOGS=.; else LOGS="run-$P"; fi
export PLAYER="$P"
./gradlew runClient --no-daemon -Pport="${1:-25565}" -Pplayer="$P" > "$LOGS/run-client.log" 2>&1 &
until grep -q "HTTP bridge listening" "$LOGS/run-client.log" 2>/dev/null; do sleep 2; done
node daemon.mjs "$P" > "$LOGS/daemon.log" 2>&1 &
sleep 2
node buddy.mjs "$P" > "$LOGS/buddy.log" 2>&1 &
# Claude's stand-in brain for when Claude's usage runs out (only for the claude player).
[ "$P" = claude ] && node backup.mjs > "$LOGS/backup.log" 2>&1 &
wait
