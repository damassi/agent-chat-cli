import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { runStandaloneAgentLoop } from "mcp/runStandaloneAgentLoop"
import { z } from "zod"

export interface AskAgentContext {
  sessionId?: string
  sessionConnectedServers: Map<string, Set<string>>
  onSessionIdUpdate: (sessionId: string) => void
}

export interface RegisterAskAgentToolProps {
  mcpServer: McpServer
  context: AskAgentContext
}

export const registerAskAgentTool = ({
  mcpServer,
  context,
}: RegisterAskAgentToolProps) => {
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
      const existingConnectedServers = context.sessionId
        ? context.sessionConnectedServers.get(context.sessionId)
        : undefined

      const { response, connectedServers } = await runStandaloneAgentLoop({
        prompt: query,
        mcpServer,
        sessionId: context.sessionId,
        existingConnectedServers,
        onSessionIdReceived: (newSessionId) => {
          context.onSessionIdUpdate(newSessionId)
        },
      })

      // Update the session's connected servers
      if (context.sessionId) {
        context.sessionConnectedServers.set(context.sessionId, connectedServers)
      }

      return {
        content: [
          {
            type: "text",
            text: response,
          },
        ],
      }
    }
  )
}
