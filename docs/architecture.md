# Architecture

### Project Overview

**Agent Chat CLI** - A terminal-based chat interface for the Claude Agent SDK with MCP support, built using React Ink for terminal UI rendering. Can run in three modes: interactive agent mode, MCP server mode (exposing the agent as a tool), or MCP client mode (connecting to an MCP server).

### Tech Stack

- **Runtime**: Bun
- **UI**: React + Ink (terminal UI)
- **State Management**: Easy-peasy
- **Agent SDK**: Claude Agent SDK
- **MCP SDK**: [Model Context Protocol TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
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

- [src/utils/runAgentLoop.ts](../src/utils/runAgentLoop.ts) - Resume-based agent loop:
  - `runAgentLoop()` - Async function that returns a conversation generator
  - Implements turn-by-turn query loop with dynamic MCP server selection
  - Maintains `connectedServers` Set across turns
  - Uses SDK's `resume` to preserve conversation history
  - Yields messages from each turn's query
  - `messageTypes` - Constants for message type checking
- [src/hooks/useAgent.ts](../src/hooks/useAgent.ts) - React hook for interactive agent mode:
  - Calls `runAgentLoop()` and processes the conversation generator
  - Handles streaming responses
  - Processes tool uses
  - Tracks session state
  - Manages server connection notifications via `onServerConnection` callback
  - Updates UI store
- [src/hooks/useMcpClient.ts](../src/hooks/useMcpClient.ts) - React hook for MCP client mode:
  - Connects to an MCP server via stdio/HTTP/SSE
  - Calls `get_agent_status` on initialization to fetch available servers
  - Calls `ask_agent` tool with 10-minute timeout for user queries
  - Handles logging notifications:
    - `system_message`: Server connection status
    - `text_message`: Streaming responses
    - `tool_use`: Tool invocations
  - Accumulates response text and properly clears between queries
  - Updates UI store with responses
  - Configured via `mcp-client.config.ts`

#### Configuration

- [agent-chat-cli.config.ts](../agent-chat-cli.config.ts) - Agent mode configuration
- [mcp-client.config.ts](../mcp-client.config.ts) - MCP client mode configuration
- [src/utils/loadConfig.ts](../src/utils/loadConfig.ts) - Configuration loader using cosmiconfig (agent mode only)
- [src/prompts/](../src/prompts/) - Per-server system prompts

#### Utilities

- [src/utils/getPrompt.ts](../src/utils/getPrompt.ts) - Loads and builds system prompts
- [src/utils/formatToolInput.ts](../src/utils/formatToolInput.ts) - Formats tool input for display
- [src/utils/getToolInfo.ts](../src/utils/getToolInfo.ts) - Parses MCP tool names and manages tool filtering:
  - `getToolInfo()` - Extracts server name and tool name from full MCP tool string
  - `getDisallowedTools()` - Builds list of denied tools from config
  - `isToolDisallowed()` - Checks if a specific tool is denied
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
- Per-server custom system prompts and descriptions
- Server status tracking
- Tool use from any connected server
- Configured via `mcpServers` in config file

#### Dynamic MCP Server Selection

The agent uses an intelligent routing system to load MCP servers on-demand instead of connecting to all servers upfront:

**Key Components:**

- [src/utils/mcpServerSelectionAgent.ts](../src/utils/mcpServerSelectionAgent.ts) - MCP server routing agent
  - Uses Claude Agent SDK's custom tool system (`createSdkMcpServer`)
  - Defines `select_mcp_servers` tool with Zod schema for structured output
  - Analyzes user message + server descriptions to determine needed servers
  - Case-insensitive server name matching
  - Tracks already-connected servers to avoid redundant connections
  - Returns both accumulated servers and newly selected servers

- [src/utils/getEnabledMcpServers.ts](../src/utils/getEnabledMcpServers.ts) - Server filtering utility
  - Filters MCP servers where `enabled !== false`
  - Shared by `runAgentLoop` and store's computed properties

- [src/utils/logger.ts](../src/utils/logger.ts) - Logging configuration
  - Exports `enableLogging` constant based on `ENABLE_LOGGING` env var
  - Centralized logging control for all routing logs

**Configuration:**

Each MCP server in `agent-chat-cli.config.ts` includes:

```typescript
{
  description: string  // Used by routing agent for intelligent matching
  enabled: boolean     // Filter servers before routing
  prompt?: string      // Optional system prompt
  // ... other config
}
```

**Resume-Based Conversation Loop:**

Instead of running one continuous `query()`, the agent runs a loop where each user message:

1. Waits for user input from message queue
2. Calls `selectMcpServers()` with:
   - Current user message
   - Enabled MCP servers list
   - Set of already-connected servers
3. Routing agent uses custom tool to return needed servers
4. New servers are accumulated into `connectedServers` Set
5. `query()` runs with:
   - `resume: sessionId` (preserves conversation history)
   - `mcpServers`: all accumulated servers
6. Processes messages until RESULT, then loops back

**Server Accumulation:**

Servers persist across conversation turns:

- Turn 1: User mentions "github" → Connects to `[github]`
- Turn 2: User mentions "sentry" → Connects to `[github, sentry]`
- Turn 3: User mentions "notion" → Connects to `[github, sentry, notion]`

The SDK's `resume` functionality maintains full conversation context while servers are dynamically added.

**User Notifications:**

System messages appear in chat when new servers connect:

```
[system] Connecting to github...
[system] Connecting to notion, salesforce...
```

**Routing Intelligence:**

The routing agent matches servers based on:

- Explicit mentions: "using github" → github
- Capability inference: "show me docs on OKRs" → notion
- Multiple servers: "query sales data" → redshift, salesforce
- No match: "what's the weather?" → no servers

#### MCP Client Flow

**Initialization:**

1. MCP client connects to server via stdio/HTTP/SSE transport
2. Client calls `get_agent_status` tool on initialization
3. Server's `getAgentStatus()` runs `runAgentLoop()` to get available MCP servers
4. Available servers list sent to client and displayed in header

**User Query Flow:**

1. User sends message → client calls `ask_agent` tool with query
2. Zod validates input schema
3. `runStandaloneAgentLoop()` creates message queue and calls `runAgentLoop()`
4. **Dynamic Server Selection** (same as interactive mode):
   - User message triggers `selectMcpServers()` routing agent
   - Routing agent analyzes message against server descriptions
   - New servers accumulated into Set across conversation turns
   - System message notification sent via `onServerConnection` callback
5. Server emits logging notifications for:
   - `system_message`: Server connection status (`[system] Connecting to...`)
   - `text_message`: Streaming assistant responses
   - `tool_use`: Tool invocations with parameters
6. Client receives notifications and updates UI in real-time
7. Session state persists for follow-up queries
8. Final text response returned to MCP client

**Key Implementation Details:**

- `runStandaloneAgentLoop()` passes `onServerConnection` callback to `runAgentLoop()`
- Server connection notifications sent as MCP logging messages
- Client accumulates response text from `text_message` notifications
- Response properly added to chat history and display cleared between queries

#### MCP Server Mode

The CLI can also run as an MCP server itself, exposing the agent as a tool to other MCP clients.

**Shared MCP Infrastructure:**

- [src/mcp/getMcpServer.ts](../src/mcp/getMcpServer.ts) - MCP server factory
  - Creates `McpServer` instance
  - Imports and registers tools from individual tool files
  - Shared by both stdio and HTTP modes
- [src/mcp/tools/](../src/mcp/tools/) - Individual MCP tool definitions
  - [askAgent.ts](../src/mcp/tools/askAgent.ts) - `ask_agent` tool with Zod validation (general purpose)
  - [askAgentSlackbot.ts](../src/mcp/tools/askAgentSlackbot.ts) - `ask_agent_slackbot` tool with thread session support
  - [getAgentStatus.ts](../src/mcp/tools/getAgentStatus.ts) - `get_agent_status` tool for initialization
- [src/mcp/runStandaloneAgentLoop.ts](../src/mcp/runStandaloneAgentLoop.ts) - Query execution
  - Uses shared `runAgentLoop()` from agent integration
  - Manages message queue and session state
  - Processes streaming responses with logging notifications
  - Implements `onServerConnection` callback for dynamic server selection
  - Returns final text response
- [src/mcp/getAgentStatus.ts](../src/mcp/getAgentStatus.ts) - Status utility
  - Initializes agent to get available MCP servers
  - Called by `get_agent_status` tool on client initialization
  - Returns session ID and MCP servers list

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
- Denied tool detection and UI indication (red "✖ Tool denied by configuration" message)

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

#### Interactive Agent Mode

1. User submits input via TextInput
2. Input added to chat history and message queue
3. `runAgentLoop` waits for message from queue
4. `selectMcpServers()` routing agent determines needed servers:
   - Analyzes user message against server descriptions
   - Returns servers to connect (case-insensitive matching)
   - Tracks already-connected servers
5. New servers added to accumulated `connectedServers` Set
6. System message shown: "[system] Connecting to server1, server2..."
7. Agent SDK `query()` runs with:
   - Resume session ID (preserves history)
   - All accumulated MCP servers
8. Streaming events update current assistant message
9. Tool uses are tracked and displayed separately
10. Final RESULT message includes stats (cost, duration, turns)
11. Loop returns to step 3 for next user message
12. UI updates reactively via easy-peasy store

#### MCP Client Mode

1. **Initialization:** Client calls `get_agent_status` to fetch available MCP servers
2. User submits input via TextInput
3. Input added to chat history and message queue
4. `useMcpClient` hook sends to MCP server's `ask_agent` tool with 10-minute timeout
5. **Server-side Dynamic Selection:** Server runs same routing logic as interactive mode:
   - `selectMcpServers()` analyzes message against server descriptions
   - New servers accumulated into Set across turns
   - Session preserved via `resume` for conversation continuity
6. Server emits logging notifications in real-time:
   - `system_message`: Server connections (`[system] Connecting to...`)
   - `text_message`: Streaming assistant responses
   - `tool_use`: Tool invocations with parameters
7. Client receives notifications and updates UI:
   - System messages added to chat history
   - Text messages displayed via `currentAssistantMessage`
   - Tool uses shown separately
8. After `ask_agent` completes:
   - Accumulated response text added to chat history
   - Display cleared for next query (`clearCurrentAssistantMessage()`)
9. UI updates reactively via easy-peasy store

#### MCP Server Mode

### Configuration System

#### Agent Mode Config

Uses `cosmiconfig` for flexible configuration loading:

- Supports TypeScript and JavaScript config files
- Multiple search locations
- Type-safe configuration interface
- Environment variable injection for MCP servers

```typescript
{
  stream?: boolean
  mcpServers: {
    [serverName]: {
      command: string
      args: string[]
      env?: Record<string, string>
      prompt?: string      // Optional system prompt
      disallowedTools?: string[] // Optional list of tools to deny
    }
  }
}
```

#### Specialized Subagents

The CLI supports specialized subagents for domain-specific tasks using the [Claude Subagent SDK](https://docs.claude.com/en/docs/claude-code/sub-agents). Subagents are defined in `agent-chat-cli.config.ts` and automatically invoked when user queries match their domain.

**Configuration:**

- [src/utils/createAgent.ts](../src/utils/createAgent.ts) - Subagent factory function
  - Creates subagent configuration with description, prompt, and MCP servers
  - Description used by routing agent for intelligent matching
  - Supports both local prompts (via `getPrompt`) and remote prompts (via `getRemotePrompt`)

**Example:**

```typescript
agents: {
  "sales-partner-sentiment-agent": createAgent({
    description: "An expert SalesForce partner sentiment agent, designed to produce insights for renewal and churn conversations",
    prompt: getPrompt("agents/sales-partner-sentiment-agent.md"),
    mcpServers: ["salesforce"],
  }),
}
```

**Flow:**

1. User sends query (e.g., "Analyze partner churn")
2. Routing agent matches query to subagent based on description
3. Required MCP servers (e.g., `salesforce`) are automatically connected
4. Subagent is invoked with specialized prompt and tools
5. Response returned to user

**Benefits:**

- Domain-specific expertise with tailored prompts
- Scoped MCP server access for security and performance
- Automatic routing based on query intent
- Supports dynamic prompt management via remote APIs

#### Tool Filtering

The `disallowedTools` configuration allows blocking specific MCP tools:

- Tool names are exact matches (wildcards not supported)
- Denied tools are passed to the SDK as `disallowedTools` option
- The SDK filters tools before they're available to the agent
- The UI displays denied tool attempts with a red "✖ Tool denied by configuration" message
- Implementation:
  - `getDisallowedTools()` converts short tool names to full MCP format (`mcp__servername__toolname`)
  - `isToolDisallowed()` checks if a tool is in the denied list
  - `ToolUses` component displays denial notice when rendering tool use history

#### MCP Client Mode Config

Direct import of `mcp-client.config.ts`:

```typescript
{
  transport: "stdio" | "http" | "sse"
  command?: string  // For stdio
  args?: string[]   // For stdio
  url?: string      // For http/sse
}
```
