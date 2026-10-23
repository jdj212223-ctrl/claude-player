#!/bin/sh
# Starts Claude's player: the Minecraft client (joining the LAN world on the given port), then the tool daemon and
# the buddy behaviour once the MCPFabric bridge is up. Usage: ./start.sh <lan-port>
cd "$(dirname "$0")"
./gradlew runClient --no-daemon -Pport="${1:-25565}" > run-client.log 2>&1 &
until grep -q "HTTP bridge listening" run-client.log 2>/dev/null; do sleep 2; done
node daemon.mjs > daemon.log 2>&1 &
sleep 2
node buddy.mjs > buddy.log 2>&1 &
wait
