import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { registerAskAgentTool } from "mcp/tools/askAgent"
import { registerAskAgentSlackbotTool } from "mcp/tools/askAgentSlackbot"
import { registerGetAgentStatusTool } from "mcp/tools/getAgentStatus"

export const getMcpServer = () => {
  // Store Claude Agent SDK sessionId per-instance (not shared across threads)
  let sessionId: string | undefined

  // Map thread IDs to Claude Agent SDK session IDs for per-thread isolation
  const threadSessions = new Map<string, string>()

  // Map session IDs to connected MCP servers for persistence across requests
  const sessionConnectedServers = new Map<string, Set<string>>()

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
      sessionConnectedServers,
      onSessionIdUpdate: (newSessionId) => {
        sessionId = newSessionId
      },
    },
  })

  registerAskAgentSlackbotTool({
    mcpServer,
    context: {
      threadSessions,
      sessionConnectedServers,
    },
  })

  registerGetAgentStatusTool({ mcpServer })

  return mcpServer
}
