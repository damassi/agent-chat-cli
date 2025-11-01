import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { loadConfig } from "utils/loadConfig"
import { MessageQueue } from "utils/MessageQueue"
import { messageTypes, runAgentLoop } from "utils/runAgentLoop"

export const getAgentStatus = async (mcpServer?: McpServer) => {
  const config = await loadConfig()
  const messageQueue = new MessageQueue()

  const { agentLoop } = await runAgentLoop({
    messageQueue,
    config,
  })

  await new Promise((resolve) => setTimeout(resolve, 0))

  messageQueue.sendMessage("status")

  for await (const message of agentLoop) {
    if (
      message.type === messageTypes.SYSTEM &&
      message.subtype === messageTypes.INIT
    ) {
      if (mcpServer && message.mcp_servers) {
        await mcpServer.sendLoggingMessage({
          level: "info",
          data: JSON.stringify({
            type: "mcp_servers",
            servers: message.mcp_servers,
          }),
        })
      }

      return {
        sessionId: message.session_id,
        mcpServers: message.mcp_servers,
      }
    }
  }

  return {
    sessionId: undefined,
    mcpServers: [],
  }
}
