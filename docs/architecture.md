# Architecture

### Project Overview

**Agent Chat CLI** - A terminal-based chat interface for the Claude Agent SDK with MCP server support, built using React Ink for terminal UI rendering. Can also run as an MCP server itself, exposing the agent as a tool to other MCP clients.

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

- [src/utils/runAgent.ts](../src/utils/runAgent.ts) - Shared agent logic:
  - `createAgentQuery()` - Creates agent query with configuration
  - `generateMessages()` - Async generator for message queue
  - `messageTypes` - Constants for message type checking
- [src/hooks/useAgent.ts](../src/hooks/useAgent.ts) - React hook that:
  - Uses shared agent logic
  - Manages the agent SDK query loop
  - Handles streaming responses
  - Processes tool uses
  - Tracks session state
  - Updates UI store

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

### MCP Server Integration (As Client)

The CLI can connect to external MCP servers as a client:

- Multiple MCP servers can be configured
- Per-server custom system prompts
- Server status tracking
- Tool use from any connected server
- Configured via `mcpServers` in config file

#### MCP Client Flow

1. MCP client calls `query_agent` tool with prompt
2. Zod validates input schema
3. `runQuery()` creates a message queue
4. `createAgentQuery()` initializes agent with shared logic
5. Prompt is resolved into the message queue
6. Agent processes via async generator
7. Response messages are collected
8. Session state persists for follow-up queries
9. Final text response returned to MCP client

#### MCP Server Mode

The CLI can also run as an MCP server itself, exposing the agent as a tool to other MCP clients.

**Shared MCP Infrastructure:**

- [src/mcp/utils/getServer.ts](../src/mcp/utils/getServer.ts) - MCP server factory
  - Creates `McpServer` instance
  - Registers `query_agent` tool with Zod validation
  - Shared by both stdio and HTTP modes
- [src/mcp/utils/runQuery.ts](../src/mcp/utils/runQuery.ts) - Query execution
  - Uses shared `createAgentQuery()` from agent integration
  - Manages message queue and session state
  - Processes streaming responses
  - Returns final text response

**Transport Implementations:**

- [src/mcp/stdio.ts](../src/mcp/stdio.ts) - Stdio transport (`bun run server`)
  - Uses `StdioServerTransport`
  - For command-line MCP clients
  - Communicates via stdin/stdout

- [src/mcp/http.ts](../src/mcp/http.ts) - HTTP transport (`bun run server:http`)
  - Uses `StreamableHTTPServerTransport`
  - For web/network-based MCP clients
  - Express server with CORS support
  - **Session Management:**
    - Stores transports by session ID in memory
    - Reuses existing transports for same session
    - Creates new transport only for `isInitializeRequest`
  - **HTTP Routes:**
    - `POST /mcp` - Initialization and JSON-RPC requests
    - `GET /mcp` - SSE streams for long-lived connections (supports Last-Event-ID for resumability)
    - `DELETE /mcp` - Session termination
  - **Lifecycle:**
    - Connects server to transport before handling first request
    - Cleans up transports on close
    - Graceful shutdown via SIGINT handler
  - Runs on port 3000 by default

### Tool Use Tracking

- Visual display of tool invocations
- Input parameter formatting
- Server name extraction from tool names (format: `mcp__servername__toolname`)

### Session Management

- Persistent session IDs
- Message queue for user input
- Async generator pattern for continuous conversation

### Cost & Performance Tracking

- Duration tracking
- Cost calculation (USD)
- Turn count
- Displayed after each agent response

### Data Flow

#### CLI Mode

1. User submits input via TextInput
2. Input added to chat history and message queue
3. `useAgent` hook processes queue via async generator
4. Agent SDK processes message with MCP servers
5. Streaming events update current assistant message
6. Tool uses are tracked and displayed separately
7. Final result includes stats (cost, duration, turns)
8. UI updates reactively via easy-peasy store

#### MCP Server Mode

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
