import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { McpServerStatus } from "store"
import { registerAskAgentTool } from "mcp/tools/askAgent"
import { registerAskAgentSlackbotTool } from "mcp/tools/askAgentSlackbot"
import { registerGetAgentStatusTool } from "mcp/tools/getAgentStatus"

export const getMcpServer = () => {
  // Store Claude Agent SDK sessionId per-instance (not shared across threads)
  let sessionId: string | undefined

  // Map thread IDs to Claude Agent SDK session IDs for per-thread isolation
  const threadSessions = new Map<string, string>()

  // Map session IDs to inferred MCP servers for persistence across requests
  const sessionInferredServers = new Map<string, Set<string>>()

  // Map session IDs to MCP server statuses for persistence across requests
  const sessionMcpServers = new Map<string, McpServerStatus[]>()

  const mcpServer = new McpServer(
    {
      name: "agent-chat-cli",
      version: "0.1.0",
    },
    {
      capabilities: {
        logging: {},
      },
    }
  )

  // Register tools
  registerAskAgentTool({
    mcpServer,
    context: {
      get sessionId() {
        return sessionId
      },
      sessionInferredServers,
      sessionMcpServers,
      onSessionIdUpdate: (newSessionId) => {
        sessionId = newSessionId
      },
    },
  })

  registerAskAgentSlackbotTool({
    mcpServer,
    context: {
      threadSessions,
      sessionInferredServers,
      sessionMcpServers,
    },
  })

  registerGetAgentStatusTool({ mcpServer })

  return mcpServer
}
