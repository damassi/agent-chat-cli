# Agent Chat CLI

A bare-bones, terminal-based chat CLI built to explore the new [Claude Agent SDK](https://docs.claude.com/en/api/agent-sdk/overview). Terminal rendering is built on top of [React Ink](https://github.com/vadimdemedes/ink).

The app has three modes:

- Interactive terminal app which communicates with LLM directly.
- Interactive terminal app _as a stand-alone MCP client_ with no direct LLM communication, serving as a frontend to the agent or other MCP servers.
- Stand-alone MCP server which clients can connect to, without TUI.

The agent, including MCP server setup, is configured in [agent-chat-cli.config.ts](agent-chat-cli.config.ts).

The MCP _client_ is configured in [mcp-client.config.ts](mcp-client.config.ts).

https://github.com/user-attachments/assets/00cfb9b6-ac65-4b95-8842-28ad0414ffd9

### Why?

This addresses a gap I’ve noticed in the ecosystem, where spinning up conversational LLM interfaces often comes with a lot of overhead. For example:

- One shouldn’t need to use VS Code, Claude, or Claude Code to interact with MCP servers, with all their abundance of features.
- How does one fine-tune behavior without expanding already long CLAUDE.md scripts (and similar configuration files)?
- What if the MCP server you’re interacting with is already an agent connected to an LLM? In that case, you incur a double tax - both in terms of latency and token expense - where responses are computed on the server and then re-computed by the client LLM. [MCP Sampling](https://modelcontextprotocol.io/specification/2025-06-18/client/sampling) is not yet widely supported.
- It’s hard to find lightweight, terminal-based chat UIs, and even harder to find terminal-based MCP _clients_, disconnected from an LLM.

This project aims to simplify things. It can run as an agent with simple UX, connected to an LLM, or as a stand-alone MCP pass-through client, sharing the same UX architecture, which communicate with an external MCP endpoint or stdio server to avoid double spends.

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

3. Update `agent-chat-cli.config.ts` with MCP data-sources. System prompts for data-sources live in `src/prompts`.

OAuth support works out of the box via `mcp-remote`:

<img width="336" height="191" alt="Screenshot 2025-10-03 at 11 57 58 AM" src="https://github.com/user-attachments/assets/1f138a05-7a05-4629-ac83-08a2a34519f2" />

See the config above for an example.

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

A system prompt can be added to the root of the config via `systemPrompt`.

To add specific instructions for each MCP server, create a markdown file in `src/prompts` and reference it in `agent-chat-cli.config.ts`:

```ts
const config = {
  systemPrompt: getPrompt("system.md"),
  mcpServers: {
    fooServer: {
      command: "npx",
      args: ["..."],
      prompt: getPrompt("my-prompt.md"),
    },
  },
}
```

#### Denying Tools

You can prevent specific MCP tools from being used by adding a `denyTools` array to your server configuration:

```ts
const config = {
  mcpServers: {
    github: {
      command: "npx",
      args: ["..."],
      denyTools: ["delete_repository", "update_secrets"],
    },
  },
}
```

Denied tools are filtered at the SDK level and won't be available to the agent.
