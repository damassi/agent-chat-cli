# Agent CLI

A bare-bones, terminal-based AI chat agent, built to explore the new [Claude Agent SDK](https://docs.claude.com/en/api/agent-sdk/overview). Terminal rendering is built on top of [React Ink](https://github.com/vadimdemedes/ink).

Additional MCP servers can be configured in [mcp.config.ts](src/mcp.config.ts).

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

Run the agent:

```bash
bun start
```

You'll see a prompt where you can type your questions or requests.

Type `exit` to quit.
