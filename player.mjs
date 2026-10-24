// Which in-game player the scripts drive. Claude's by default (game folder run/, daemon on 25601); PLAYER=<name> drives
// another one made with any-ai/new-player.sh (game folder run-<name>/, daemon on its bridge port + 1).
import { readFileSync } from "node:fs";
const root = new URL(".", import.meta.url).pathname;
export const NAME = process.env.PLAYER ?? "claude";
export const RUN = root + (NAME === "claude" ? "run/" : `run-${NAME}/`);
let bridge = 25600;
try { bridge = JSON.parse(readFileSync(RUN + "config/mcpfabric.config.json", "utf8")).port; } catch {}
export const DAEMON_PORT = bridge + 1;
export const DAEMON = `http://127.0.0.1:${DAEMON_PORT}`;
// buddy.mjs reads this to know whom to follow ("follow <name>" or "off").
export const MODE = NAME === "claude" ? root + "buddy.mode" : RUN + "buddy.mode";
