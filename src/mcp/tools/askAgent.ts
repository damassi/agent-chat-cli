import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { McpServerStatus } from "store"
import { runStandaloneAgentLoop } from "mcp/runStandaloneAgentLoop"
import { z } from "zod"

export interface AskAgentContext {
  sessionId?: string
  sessionInferredServers: Map<string, Set<string>>
  sessionMcpServers: Map<string, McpServerStatus[]>
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
      const existingInferredServers = context.sessionId
        ? context.sessionInferredServers.get(context.sessionId)
        : undefined

      const existingMcpServers = context.sessionId
        ? context.sessionMcpServers.get(context.sessionId)
        : undefined

      const { response, inferredServers } = await runStandaloneAgentLoop({
        prompt: query,
        mcpServer,
        sessionId: context.sessionId,
        existingInferredServers,
        existingMcpServers,
        onSessionIdReceived: (newSessionId) => {
          context.onSessionIdUpdate(newSessionId)
        },
      })

      // Update the session's inferred servers
      if (context.sessionId) {
        context.sessionInferredServers.set(context.sessionId, inferredServers)
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
