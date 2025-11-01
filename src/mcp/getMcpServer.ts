import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { getAgentStatus } from "mcp/getAgentStatus"
import { runStandaloneAgentLoop } from "mcp/runStandaloneAgentLoop"
import { z } from "zod"

export const getMcpServer = () => {
  // Store Claude Agent SDK sessionId per-instance (not shared across threads)
  let claudeSessionId: string | undefined

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
      const existingConnectedServers = claudeSessionId
        ? sessionConnectedServers.get(claudeSessionId)
        : undefined

      const { response, connectedServers } = await runStandaloneAgentLoop({
        prompt: query,
        mcpServer,
        sessionId: claudeSessionId,
        existingConnectedServers,
        onSessionIdReceived: (newSessionId) => {
          claudeSessionId = newSessionId
        },
      })

      // Update the session's connected servers
      if (claudeSessionId) {
        sessionConnectedServers.set(claudeSessionId, connectedServers)
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
        ? threadSessions.get(threadId)
        : undefined

      const existingConnectedServers = existingSessionId
        ? sessionConnectedServers.get(existingSessionId)
        : undefined

      const { response, connectedServers } = await runStandaloneAgentLoop({
        prompt: query,
        mcpServer,
        sessionId: existingSessionId,
        additionalSystemPrompt: systemPrompt,
        existingConnectedServers,
        onSessionIdReceived: (newSessionId) => {
          if (threadId) {
            threadSessions.set(threadId, newSessionId)
          }
        },
      })

      // Update the session's connected servers
      if (existingSessionId || threadId) {
        const sessionId = existingSessionId || threadSessions.get(threadId!)
        if (sessionId) {
          sessionConnectedServers.set(sessionId, connectedServers)
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
