// Keeps MCP connections open so background jobs (collect, travel, explore) survive between calls:
//   "me"   = Claude's own client (bridge on 25600, token from run/config),
//   "host" = the user's game (their own MCPFabric bridge, via mcpfabric/run-mcp.sh, which reads its token itself).
// mc.mjs, talk.mjs, status.mjs and buddy.mjs talk to it over http://127.0.0.1:25601 with {tool, args, target}.
import { createServer } from "node:http";
import { resolve } from "node:path";
const dir = new URL(".", import.meta.url).pathname;
// Where the MCPFabric checkout lives (its mcp-server must be built), and the command that starts an MCP server
// for the host player's game, which reads that game's token itself.
const MCPFABRIC = resolve(process.env.MCPFABRIC_DIR ?? dir + "../mcpfabric");
const { Client } = await import(MCPFABRIC + "/mcp-server/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js");
const { StdioClientTransport } = await import(MCPFABRIC + "/mcp-server/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js");
const COMMANDS = { me: dir + "run-mcp.sh", host: process.env.HOST_MCP ?? MCPFABRIC + "/run-mcp.sh" };
const clients = {};

// Connect on first use and again after a failure (the host bridge only exists while the user's game runs).
async function client(target) {
  if (!clients[target]) {
    const c = new Client({ name: "claude-player", version: "2.0.0" });
    await c.connect(new StdioClientTransport({ command: COMMANDS[target], stderr: "ignore" }));
    clients[target] = c;
  }
  return clients[target];
}

createServer(async (req, res) => {
  let body = "";
  for await (const chunk of req) body += chunk;
  let target = "me";
  try {
    const { tool, args = {}, target: t = "me" } = JSON.parse(body);
    target = t;
    if (!COMMANDS[target]) throw new Error("unknown target " + target);
    const c = await client(target);
    const out = tool === "list"
      ? { content: [{ type: "text", text: (await c.listTools()).tools.map(x => x.name).join(" ") }] }
      : await c.callTool({ name: tool, arguments: args }, undefined, { timeout: 120000 });
    res.end(JSON.stringify(out));
  } catch (e) {
    try { await clients[target]?.close(); } catch {}
    delete clients[target];
    res.end(JSON.stringify({ content: [{ type: "text", text: "ERROR " + e.message }] }));
  }
}).listen(25601, "127.0.0.1");
