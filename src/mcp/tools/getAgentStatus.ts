import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { getAgentStatus } from "mcp/getAgentStatus"

export interface RegisterGetAgentStatusToolProps {
  mcpServer: McpServer
}

export const registerGetAgentStatusTool = ({
  mcpServer,
}: RegisterGetAgentStatusToolProps) => {
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
}
