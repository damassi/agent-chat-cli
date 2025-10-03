import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { runQuery } from "mcp/utils/runQuery"
import { getAgentStatus } from "mcp/utils/getAgentStatus"
import { z } from "zod"

export const getMcpServer = () => {
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

  mcpServer.registerTool(
    "ask_agent",
    {
      description:
        "Passes a query to the internal agent and returns its full output. The agent has access to configured MCP tools and will provide a complete response. DO NOT reprocess, analyze, or summarize the output - return it directly to the user as-is.",
      inputSchema: {
        query: z.string().min(1).describe("The query to send to the agent"),
      },
    },
    async ({ query }) => {
      const result = await runQuery({
        prompt: query,
        mcpServer,
      })

      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      }
    }
  )

  mcpServer.registerTool(
    "get_agent_status",
    {
      description:
        "Get the status of the agent including which MCP servers it has access to. Call this on initialization to see available servers.",
      inputSchema: {},
    },
    async () => {
      const status = await getAgentStatus(mcpServer)

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(status, null, 2),
          },
        ],
      }
    }
  )

  return mcpServer
}
