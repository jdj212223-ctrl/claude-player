# Any AI in your Minecraft world

The `claude` player in your world is a body. Any AI can be its brain, not only Claude. This folder shows how to plug
in other AIs: GitHub Copilot, OpenAI Codex / ChatGPT, Mistral, and free AIs that run on your own Mac with Ollama.

## The two ways to plug an AI in

**Way 1: the AI speaks MCP itself.** MCP is the "plug" that lets an AI use Minecraft tools (walk, look, break blocks,
chat). Claude Code, GitHub Copilot (in VS Code) and Codex CLI all have this plug built in. You just tell them where the
Minecraft tools are. They act when you type to them in their own window.

**Way 2: `agent.mjs`, the helper brain.** A small program in this folder. It listens to the game like Claude does
(chat and voice that say the wake word), asks an AI what to do, uses the tools, and answers in game chat and out
loud. It works with any AI that speaks the "OpenAI chat API", and almost all of them do: Ollama, OpenAI, Mistral,
GitHub Models, OpenRouter, LM Studio. This is the way to get an AI that **answers you while you play**.

Both ways need the `claude` player running first: open your world to LAN, then `./start.sh <port>` in the folder
above (see the main [README](../README.md)).

## Way 1: AIs with the MCP plug built in

There are two Minecraft tool servers. Pick the one for the player the AI should control:

| Command | Controls |
|---|---|
| `/Volumes/important/claude-player/run-mcp.sh` | the `claude` player (the AI's own body) |
| `/Volumes/important/mcpfabric/run-mcp.sh` | your own game (your player, plus commands like teleport) |

Change the path if your folders are somewhere else.

### GitHub Copilot (VS Code agent mode)

Make a file `.vscode/mcp.json` in any folder you open in VS Code:

```json
{
  "servers": {
    "minecraft": {
      "type": "stdio",
      "command": "/Volumes/important/claude-player/run-mcp.sh"
    }
  }
}
```

Open the Copilot Chat, switch it to **Agent**, click the tools button and check that `minecraft` is on. Then
type something like "look around in Minecraft and tell me what you see".

### OpenAI Codex CLI

Add this to `~/.codex/config.toml` (make the file if it isn't there):

```toml
[mcp_servers.minecraft]
command = "/Volumes/important/claude-player/run-mcp.sh"
tool_timeout_sec = 120
```

Or let Codex write it for you:

```bash
codex mcp add minecraft -- /Volumes/important/claude-player/run-mcp.sh
```

Then start `codex` and ask it to play.

### ChatGPT and Mistral Le Chat (the websites and apps)

Honest answer: **these don't work, and that's on purpose.** Their "connectors" live on the internet, so they can only
reach an MCP server that is on the internet too (a public `https://` address). The Minecraft tool server only lets in
programs from your own Mac, and it has no password. Putting it on the internet would let anyone control your game.

What to do instead: use the same AIs through Way 2 below. ChatGPT's models come from the OpenAI API and Le Chat's from
the Mistral API, and `agent.mjs` can use both.

## Way 2: `agent.mjs`, an AI that plays with you

You need [Node.js](https://nodejs.org) (you already have it if Claude's player runs). Start it from the
`claude-player` folder:

```bash
node any-ai/agent.mjs
```

Now say "claude ..." in chat or voice chat and the AI answers. Stop it with Ctrl+C.

That drives Claude's body, so don't run it while Claude itself is listening, or both answer at once. Better: give the
AI **its own player**, next section.

### Give the AI its own player

Every AI can have its own character in the world, like Claude has. Pick a name (here `ollama`), make its game folder
once, then start it while your world is open to LAN (25569 is your LAN port):

```bash
any-ai/new-player.sh ollama
```

```bash
PLAYER=ollama ./start.sh 25569
```

When it has joined, start its brain:

```bash
PLAYER=ollama node any-ai/agent.mjs
```

Now say "ollama ..." in chat. Its name is its wake word. All the other scripts work for it too, with `PLAYER=ollama`
in front (for example `PLAYER=ollama node status.mjs`). A second player needs another number if you make a third:
`any-ai/new-player.sh mistral 25604`.

Each extra Minecraft uses about 2 to 3 GB of memory. On a 16 GB Mac, run one bot at a time, or your game lags. New
players get tiny graphics (2 chunks, 10 FPS, no sound) to stay light.

### Settings

You set these in front of the command, like `AI_MODEL=llama3.2 node any-ai/agent.mjs`.

| Setting | What it does | Default |
|---|---|---|
| `AI_BASE_URL` | where the AI lives | `http://127.0.0.1:11434/v1` (Ollama on your Mac) |
| `AI_MODEL` | which AI model | `qwen3:4b-instruct` |
| `AI_API_KEY` | your key for paid AIs (keep it secret!) | none |
| `PLAYER` | which player's body it drives | `claude` |
| `AI_NAME` | the name the AI is told it has | the player's name |
| `WAKE` | the words that wake it, split with `\|` | the player's name |
| `TALK_LABEL` | the name in brackets in chat, like `[ollama]` | the player's name |
| `EARS_VOICE` | `0` = only listen to text chat, not voice | voice on |

The AI's rules are in [PLAYBOOK.md](PLAYBOOK.md). Change them to change how it behaves.

### Ollama (free, runs on your Mac, nothing leaves your computer)

```bash
brew install ollama
```

```bash
OLLAMA_MODELS=/Volumes/important/ollama-models ollama serve
```

Leave that running. In another terminal, download a model once:

```bash
OLLAMA_MODELS=/Volumes/important/ollama-models ollama pull qwen3:4b-instruct
```

Then `node any-ai/agent.mjs` (no settings needed, Ollama is the default).

Picking a model on a 16 GB Mac: two Minecrafts already use a lot of memory, so stay small (3 to 8 billion
"parameters", 2 to 5 GB) and pick one that can use tools. `qwen3:4b-instruct` answers in about a second and uses tools
well. `llama3.2:3b` is smaller, `qwen3:8b` is smarter but slower. Avoid "thinking" models (like plain `qwen3:4b`):
they think for 30 seconds before every answer.

### OpenAI (the models behind ChatGPT and Codex)

Make a key at platform.openai.com (it costs money per use, ask a parent first), then:

```bash
AI_BASE_URL=https://api.openai.com/v1 AI_MODEL=gpt-4.1-mini AI_API_KEY=sk-your-key node any-ai/agent.mjs
```

### Mistral (the models behind Le Chat)

Make a key at console.mistral.ai, then:

```bash
AI_BASE_URL=https://api.mistral.ai/v1 AI_MODEL=mistral-small-latest AI_API_KEY=your-key node any-ai/agent.mjs
```

### GitHub Models (Copilot's models, with a GitHub token)

Make a GitHub token with the "Models" permission, then:

```bash
AI_BASE_URL=https://models.github.ai/inference AI_MODEL=openai/gpt-4.1-mini AI_API_KEY=your-github-token node any-ai/agent.mjs
```

Model names change over time: if one is refused, look up the current list on that AI's website.

## How `agent.mjs` works, in short

1. It starts `ears.mjs`, which prints a line whenever someone says the wake word.
2. Each line goes to the AI with the rules from `PLAYBOOK.md` and six tools: `say`, `status`, `follow`, `stop`,
   `go_to`, and `minecraft` (which reaches all ~90 MCPFabric tools by name).
3. The AI calls tools (up to 8 rounds), the program runs them through `daemon.mjs`, and the answer goes to chat and
   voice with `talk.mjs`.
4. It remembers the last 30 messages, so you can keep a conversation going.
