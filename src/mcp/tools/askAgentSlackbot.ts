import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { runStandaloneAgentLoop } from "mcp/runStandaloneAgentLoop"
import { z } from "zod"

export interface AskAgentSlackbotContext {
  threadSessions: Map<string, string>
  sessionConnectedServers: Map<string, Set<string>>
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

      const existingConnectedServers = existingSessionId
        ? context.sessionConnectedServers.get(existingSessionId)
        : undefined

      const { response, connectedServers } = await runStandaloneAgentLoop({
        prompt: query,
        mcpServer,
        sessionId: existingSessionId,
        additionalSystemPrompt: systemPrompt,
        existingConnectedServers,
        onSessionIdReceived: (newSessionId) => {
          if (threadId) {
            context.threadSessions.set(threadId, newSessionId)
          }
        },
      })

      // Update the session's connected servers
      if (existingSessionId || threadId) {
        const sessionId =
          existingSessionId || context.threadSessions.get(threadId!)
        if (sessionId) {
          context.sessionConnectedServers.set(sessionId, connectedServers)
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
