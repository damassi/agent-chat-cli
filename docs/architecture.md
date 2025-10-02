# Architecture

### Project Overview

**Agent Chat CLI** - A terminal-based chat interface for the Claude Agent SDK with MCP server support, built using React Ink for terminal UI rendering.

### Tech Stack

- **Runtime**: Bun
- **UI**: React + Ink (terminal UI)
- **State Management**: Easy-peasy
- **Agent SDK**: Claude Agent SDK
- **Language**: TypeScript

### Core Components

#### Entry Point & Setup

- [src/index.tsx](../src/index.tsx) - Application entry point, validates environment and renders the app
- [src/App.tsx](../src/App.tsx) - Root component that wraps the application with the store provider

#### Main Interface

- [src/AgentChat.tsx](../src/AgentChat.tsx) - Main chat interface component that handles:
  - Chat history rendering
  - User input handling
  - Tool use display
  - Message submission

#### State Management

- [src/store.ts](../src/store.ts) - Global state management using easy-peasy, includes:
  - Chat history
  - Current assistant message (for streaming)
  - Tool uses
  - MCP server status
  - Session management
  - Processing state

#### Agent Integration

- [src/hooks/useAgent.ts](../src/hooks/useAgent.ts) - Core hook that:
  - Loads configuration
  - Manages the agent SDK query loop
  - Handles streaming responses
  - Processes tool uses
  - Tracks session state

#### Configuration

- [agent-chat-cli.config.ts](../agent-chat-cli.config.ts) - Main configuration file
- [src/utils/loadConfig.ts](../src/utils/loadConfig.ts) - Configuration loader using cosmiconfig
- [src/prompts/](../src/prompts/) - Per-server system prompts

#### Utilities

- [src/utils/getPrompt.ts](../src/utils/getPrompt.ts) - Loads and builds system prompts
- [src/utils/formatToolInput.ts](../src/utils/formatToolInput.ts) - Formats tool input for display
- [src/utils/getToolInfo.ts](../src/utils/getToolInfo.ts) - Parses MCP tool names
- [src/utils/validateEnv.ts](../src/utils/validateEnv.ts) - Environment validation

#### UI Components

- [src/components/ChatHeader.tsx](../src/components/ChatHeader.tsx) - Header display
- [src/components/Markdown.tsx](../src/components/Markdown.tsx) - Markdown renderer for agent responses
- [src/components/Stats.tsx](../src/components/Stats.tsx) - Cost/duration statistics display
- [src/components/ToolUses.tsx](../src/components/ToolUses.tsx) - Tool use display component

### Key Features

### Streaming Support

Configurable streaming responses via `config.stream`.

#### MCP Server Integration

- Multiple MCP servers can be configured
- Per-server custom system prompts
- Server status tracking
- Tool use from any connected server

#### Tool Use Tracking

- Visual display of tool invocations
- Input parameter formatting
- Server name extraction from tool names (format: `mcp__servername__toolname`)

#### Session Management

- Persistent session IDs
- Message queue for user input
- Async generator pattern for continuous conversation

#### Cost & Performance Tracking

- Duration tracking
- Cost calculation (USD)
- Turn count
- Displayed after each agent response

### Data Flow

1. User submits input via TextInput
2. Input added to chat history and message queue
3. `useAgent` hook processes queue via async generator
4. Agent SDK processes message with MCP servers
5. Streaming events update current assistant message
6. Tool uses are tracked and displayed separately
7. Final result includes stats (cost, duration, turns)
8. UI updates reactively via easy-peasy store

### Configuration System

Uses `cosmiconfig` for flexible configuration loading:

- Supports TypeScript and JavaScript config files
- Multiple search locations
- Type-safe configuration interface
- Environment variable injection for MCP servers

### Config Structure

```typescript
{
  stream?: boolean
  mcpServers: {
    [serverName]: {
      command: string
      args: string[]
      env?: Record<string, string>
      prompt?: string  // Optional system prompt
    }
  }
}
```
