#!/bin/sh
# MCP server for Claude's own client (bridge on 25600), token read from its config at launch.
# PLAYER=<name> serves another AI player instead (game folder run-<name>/, its own bridge port).
RUN=run; [ -n "$PLAYER" ] && [ "$PLAYER" != claude ] && RUN="run-$PLAYER"
CFG="$(dirname "$0")/$RUN/config/mcpfabric.config.json"
MCPFABRIC_TOKEN=$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["token"])' "$CFG")
PORT=$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1])).get("port", 25600))' "$CFG")
export MCPFABRIC_TOKEN
export MCPFABRIC_URL=http://127.0.0.1:$PORT
exec node "${MCPFABRIC_DIR:-$(dirname "$0")/../mcpfabric}/mcp-server/dist/index.js"
