import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { runQuery } from "mcp/utils/runQuery"
import { z } from "zod"

export const getMcpServer = () => {
  const mcpServer = new McpServer({
    name: "agent-chat-cli",
    version: "0.1.0",
  })

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
      const result = await runQuery(query)

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

  return mcpServer
}
