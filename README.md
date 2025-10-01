# Agent Chat CLI

A bare-bones, terminal-based chat CLI built to explore the new [Claude Agent SDK](https://docs.claude.com/en/api/agent-sdk/overview). Terminal rendering is built on top of [React Ink](https://github.com/vadimdemedes/ink).

Additional MCP servers can be configured in [mcp.config.ts](src/mcp.config.ts).

https://github.com/user-attachments/assets/466c98c3-ce36-4916-b196-6650921facbd

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

#### Updating MCP System Prompts

If you'd like to add specific instructions for each connected tool, add a markdown file to `src/prompts` and update the corresponding tool with a `prompt` key in `mcp.config.ts`:

```ts
{
  fooServer: {
    prompt: readPrompt("my-prompt.md")
  }
}
```
