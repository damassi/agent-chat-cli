import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { McpServerStatus } from "store"
import { runStandaloneAgentLoop } from "mcp/runStandaloneAgentLoop"
import { z } from "zod"

export interface AskAgentSlackbotContext {
  threadSessions: Map<string, string>
  sessionInferredServers: Map<string, Set<string>>
  sessionMcpServers: Map<string, McpServerStatus[]>
}

export interface RegisterAskAgentSlackbotToolProps {
  mcpServer: McpServer
  context: AskAgentSlackbotContext
}

export const registerAskAgentSlackbotTool = ({
  mcpServer,
  context,
}: RegisterAskAgentSlackbotToolProps) => {
  mcpServer.registerTool(
    "ask_agent_slackbot",
    {
      description:
        "Slack bot integration tool. Passes a query to the internal agent and returns a response optimized for Slack. Supports per-thread session isolation.",
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe("The slack query to send to the agent"),
        systemPrompt: z
          .string()
          .optional()
          .describe("Optional additional system prompt to prepend"),
        threadId: z
          .string()
          .optional()
          .describe("Slack thread identifier for session isolation"),
      },
    },
    async ({ query, systemPrompt, threadId }) => {
      const existingSessionId = threadId
        ? context.threadSessions.get(threadId)
        : undefined

      const existingInferredServers = existingSessionId
        ? context.sessionInferredServers.get(existingSessionId)
        : undefined

      const existingMcpServers = existingSessionId
        ? context.sessionMcpServers.get(existingSessionId)
        : undefined

      const { response, inferredServers } = await runStandaloneAgentLoop({
        prompt: query,
        mcpServer,
        sessionId: existingSessionId,
        additionalSystemPrompt: systemPrompt,
        existingInferredServers,
        existingMcpServers,
        onSessionIdReceived: (newSessionId) => {
          if (threadId) {
            context.threadSessions.set(threadId, newSessionId)
          }
        },
      })

      // Update the session's inferred servers
      if (existingSessionId || threadId) {
        const sessionId =
          existingSessionId || context.threadSessions.get(threadId!)
        if (sessionId) {
          context.sessionInferredServers.set(sessionId, inferredServers)
        }
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
