#!/bin/zsh
# Usage: ./swap_alpha.sh <old-version> <new-version> [user-game-pid]
# Waits for the user's Minecraft to close, swaps the Interceptors jar in all three mods folders, then rejoins Claude,
# (and, with WITH_OLLAMA=1, Ollama and his brain: he costs ~2 GB plus 3 GB while thinking, so he's off by default) once
# the user's LAN world is open again on 25565.
cd /Volumes/important/claude-player
OLD=$1 NEW=$2 PID=$3
[ -n "$PID" ] && while kill -0 $PID 2>/dev/null; do sleep 3; done
I="/Volumes/important/ModrinthApp-duplicate-copy/profiles/New instance (1) (5)/mods"
for d in "$I" run/mods run-ollama/mods; do rm -f "$d/interceptors-2.0.0-$OLD.jar"; cp "/Volumes/important/interceptors/build/libs/interceptors-2.0.0-$NEW.jar" "$d/"; ls "$d" | grep interceptors; done
sed -i '' "s/2.0.0-$OLD since/2.0.0-$NEW since/" ~/.claude/projects/-Volumes-important/memory/claude-player.md
echo swapped
until lsof -nP -iTCP:25565 -sTCP:LISTEN -t >/dev/null 2>&1; do sleep 5; done; sleep 15
(./start.sh 25565 &)
[ "$WITH_OLLAMA" = 1 ] || { echo claude-joining; exit 0; }
until node mc.mjs get_screen 2>/dev/null | grep -q '"inWorld": true'; do sleep 5; done; sleep 10
(PLAYER=ollama ./start.sh 25565 &)
until PLAYER=ollama node mc.mjs get_screen 2>/dev/null | grep -q '"inWorld": true'; do sleep 5; done
echo "follow jdj125" > run-ollama/buddy.mode
nohup env PLAYER=ollama node any-ai/agent.mjs > ollama-agent.log 2>&1 &
echo all-joined
