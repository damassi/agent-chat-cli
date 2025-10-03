# Agent Chat CLI

A bare-bones, terminal-based agent app built to explore the new [Claude Agent SDK](https://docs.claude.com/en/api/agent-sdk/overview). Terminal rendering is built on top of [React Ink](https://github.com/vadimdemedes/ink).

The app has two modes:

- An interactive terminal app
- Stand-alone MCP server. Expose the agent as a tool to other MCP clients.

MCP servers can be configured in [agent-chat-cli.config.ts](agent-chat-cli.config.ts).

https://github.com/user-attachments/assets/00cfb9b6-ac65-4b95-8842-28ad0414ffd9

### Setup

1. Install dependencies:

```bash
bun install
```

2. Configure environment variables:

```bash
cp .env.example .env
```

Then edit `.env` and fill in the required values.

### Usage

#### Interactive Mode

Run the agent in interactive terminal mode:

```bash
bun start
```

You'll see a prompt where you can type your questions or requests.

Type `exit` to quit.

#### MCP Server Mode

Run as an MCP server, using one of two modes:

```bash
bun run server # stdio
bun run server:http
```

The server exposes an `ask_agent` tool that other MCP clients can use to interact with the agent. The agent has access to all configured MCP servers and can use their tools.

### Configuration

MCP servers and system prompts are configured in `agent-chat-cli.config.ts`.

To add specific instructions for each MCP server, create a markdown file in `src/prompts` and reference it in the config:

```ts
const config = {
  mcpServers: {
    fooServer: {
      command: "npx",
      args: ["..."],
      prompt: getPrompt("my-prompt.md"),
    },
  },
}

export default config
```
