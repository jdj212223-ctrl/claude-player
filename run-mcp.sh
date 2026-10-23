#!/bin/sh
# MCP server for Claude's own client (bridge on 25600), token read from its config at launch.
CFG="$(dirname "$0")/run/config/mcpfabric.config.json"
MCPFABRIC_TOKEN=$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["token"])' "$CFG")
export MCPFABRIC_TOKEN
export MCPFABRIC_URL=http://127.0.0.1:25600
exec node "${MCPFABRIC_DIR:-$(dirname "$0")/../mcpfabric}/mcp-server/dist/index.js"
