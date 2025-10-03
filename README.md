# Agent Chat CLI

A bare-bones, terminal-based agent app built to explore the new [Claude Agent SDK](https://docs.claude.com/en/api/agent-sdk/overview). Terminal rendering is built on top of [React Ink](https://github.com/vadimdemedes/ink).

The app has three modes:

- Interactive terminal app which communicates with LLM directly.
- Interactive terminal app _as a stand-alone MCP client_ with no direct LLM communication, serving as a frontend to the agent or other MCP servers.
- Stand-alone MCP server which clients can connect to, without TUI.

The agent, including MCP server setup, is configured in [agent-chat-cli.config.ts](agent-chat-cli.config.ts).

The MCP _client_ is configured in [mcp-client.config.ts](mcp-client.config.ts).

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

#### Interactive Agent Mode

Run the agent in interactive terminal mode:

```bash
bun start
```

You'll see a prompt where you can type your questions or requests.

Type `exit` to quit.

#### Interactive MCP Client

To run as an MCP client (connecting to an MCP server):

```bash
bun start:client
```

By default it will launch the MCP stdio server in the background (ie, `bun server`).

Configure the MCP server connection in `mcp-client.config.ts`. HTTP is also supported.

#### MCP Server Mode

Run as a stand-alone MCP server, using one of two modes:

```bash
bun server
bun server:http
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
