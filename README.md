# Agent Chat CLI

A minimalist, terminal-based chat CLI built to explore the new [Claude Agent SDK](https://docs.claude.com/en/api/agent-sdk/overview). Terminal rendering is built on top of [React Ink](https://github.com/vadimdemedes/ink).

Additionally, via inference, Agent Chat CLI supports lazy, turn-based MCP connections to keep token costs down and performance reasonable. The agent will only use those MCP servers you ask about, limiting the context that is sent up to the LLM. (After an MCP server is connected it remains connected, however.)

For a simplified Python version of this lib, see [agent-chat-cli-python](https://github.com/damassi/agent-chat-cli-python).

## Overview

The app has three modes:

- Interactive terminal app which communicates with LLM directly.
- Interactive terminal app _as a stand-alone MCP client_ with no direct LLM communication, serving as a frontend to the agent or other MCP servers.
- Stand-alone MCP server which clients can connect to, without TUI.

The agent, including MCP server setup, is configured in [agent-chat-cli.config.ts](agent-chat-cli.config.ts).

The MCP _client_ is configured in [mcp-client.config.ts](mcp-client.config.ts).

https://github.com/user-attachments/assets/f9a82631-ee26-4a7b-9d89-a732d2605513

### Why?

This addresses a gap I’ve noticed in the ecosystem, where spinning up conversational LLM interfaces often come with a lot of overhead. For example:

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

### Example MCP Servers

For demonstration purposes, Agent is configured with the following MCP servers:

- **Chrome DevTools MCP**: https://developer.chrome.com/blog/chrome-devtools-mcp
- **Github MCP**: https://github.com/github/github-mcp-server
  - [Generate a Github PAT token](https://github.com/settings/personal-access-tokens)
- **Notion MCP**: https://developers.notion.com/docs/mcp
  - Authenticate via OAuth, which will launch a browser when attempting to connect

**Note**: OAuth-based MCP servers (Notion, JIRA, etc) require browser-based authentication and cannot be deployed remotely. These servers are only accessible in the CLI version of the agent.

### Usage

#### Interactive Agent Mode

Run the agent in interactive terminal mode:

```bash
bun start
```

You'll see a prompt where you can type your questions or requests. If you send it a general "Help!" query it will generate a help menu based upon configured MCP servers, if said MCP servers have corresponding system prompts in the `prompts` folder:

<img width="813" height="590" alt="Image" src="https://github.com/user-attachments/assets/2350639a-fb12-496a-9b32-b484fc14b8af" />

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
bun server:http # streaming HTTP (use this for deployments)
bun server # stdio
```

The MCP server exposes an `ask_agent` and `ask_agent_slackbot` tools that other MCP clients can use to interact with the agent. The agent has access to all configured MCP servers and can use their tools.

### Configuration

MCP servers and system prompts are configured in `agent-chat-cli.config.ts`.

A system prompt can be added to the root of the config via `systemPrompt`.

To add specific instructions for each MCP server, create a markdown file in `src/prompts` and reference it in `agent-chat-cli.config.ts`:

```ts
const config = {
  systemPrompt: getPrompt("system.md"),
  mcpServers: {
    someMcpServer: {
      description:
        "A detailed description of the MCP server and its capabilities used to provide hints to inference agent",
      command: "bunx",
      args: ["..."],
      prompt: getPrompt("someMcpServer.md"),
    },
  },
}
```

The `description` field is **critical**; it's used by the inference routing agent to determine when to invoke the server or subagent.

#### Remote Prompts

Prompts can be loaded from remote sources (e.g., APIs) using `getRemotePrompt`. This enables dynamic prompt management where prompts are stored in a database or CMS rather than in files.

Both `getPrompt` (for local files) and `getRemotePrompt` (for API calls) return lazy functions that are only evaluated when the agent needs them, ensuring prompts are fetched on-demand during each LLM turn, enabling iteration in real time.

```ts
import { getRemotePrompt } from "./src/utils/getRemotePrompt"

const config = {
  systemPrompt: getRemotePrompt(),
  mcpServers: {
    someMcpServer: {
      command: "bunx",
      args: ["..."],
      prompt: getRemotePrompt({
        fetchPrompt: async () => {
          const response = await fetch("https://some-prompt/name")

          if (!response.ok) {
            throw new Error(
              `[agent] [getRemotePrompt] [ERROR HTTP] status: ${response.status}`
            )
          }

          const text = await response.text()
          return text
        },
      }),
    },
  },
}
```

You can also provide a fallback to a local file if the remote fetch fails:

```ts
const config = {
  mcpServers: {
    github: {
      prompt: getRemotePrompt({
        fallback: "github.md"
        fetchPrompt: ...
      }),
    },
  },
}
```

#### Denying Tools

You can limit what tools the claude-agent-sdk has access to by adding a `disallowedTools` config:

```ts
const config = {
  disallowedTools: ["Bash"],
}
```

You can also prevent specific MCP tools from being used by adding a `disallowedTools` array to your server configuration:

```ts
const config = {
  mcpServers: {
    github: {
      command: "bunx",
      args: ["..."],
      disallowedTools: ["delete_repository", "update_secrets"],
    },
  },
}
```

Denied tools are filtered at the SDK level and won't be available to the agent.

In CLI mode, if `permissionMode` is set to "ask" then a prompt will appear to confirm when tools need to be invoked.

### Specialized Subagents

You can define specialized subagents in `agent-chat-cli.config.ts` to handle domain-specific tasks, leveraging the powerful [Claude Subagent SDK](https://docs.claude.com/en/docs/claude-code/sub-agents). Subagents are automatically invoked when user queries match their domain, and they have access to specific MCP servers.

#### Example

```ts
import { createAgent } from "./src/utils/createAgent"
import { getPrompt } from "./src/utils/getPrompt"

const config = {
  agents: {
    "sales-partner-sentiment-agent": createAgent({
      description:
        "An expert SalesForce partner sentiment agent, designed to produce insights for renewal and churn conversations",
      prompt: getPrompt("agents/sales-partner-sentiment-agent.md"),
      mcpServers: ["salesforce"],
      disallowedTools: ["Bash"],
    }),
  },
  mcpServers: {
    salesforce: {
      description: "Salesforce CRM: leads, opportunities, accounts...",
      command: "bunx",
      args: ["-y", "@tsmztech/mcp-server-salesforce@0.0.3"],
      enabled: true,
    },
  },
}
```

When a user asks something like "Analyze partner churn", the routing agent will:

1. Match the query to the `sales-partner-sentiment-agent` based on its description
2. Automatically connect to the required `salesforce` MCP server
3. Invoke the subagent with its specialized prompt and tools

**Note:** Subagents also support remote prompts via `getRemotePrompt`, allowing you to manage agent prompts dynamically from an API or database.

### Note on Lazy MCP Server Initialization

In order to keep LLM costs low and response times quick, a specialized sub-agent sits in front of user queries to infer which MCP servers are needed; the result is then forwarded on to the main agent, lazily initializing required MCP servers. Without this, we would need to initialize _all_ MCP servers defined in the config upfront, and for every query that we send to Anthropic, we'd _also_ be sending along a huge system prompt, and this is very expensive!

#### The Flow

- User sends a message, something like "In Salesforce, tell me about some recent leads"
- Sub-agent forwards message onto Anthropic's light-weight Haiku model and asks which MCP servers seem to be necessary
- Returns result as JSON, and based on the result, mcpServers are passed to the main agent query
- Agent now boots quickly and responds in a timely way, vs having to wait for every MCP server to initialize before being able to chat
