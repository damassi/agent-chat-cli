import {
  createSdkMcpServer,
  query,
  tool,
  type SDKUserMessage,
} from "@anthropic-ai/claude-agent-sdk"
import type { AgentConfig } from "utils/createAgent"
import { log } from "utils/logger"
import { z } from "zod"
import { messageTypes } from "./runAgentLoop"

interface SelectMcpServersOptions {
  abortController?: AbortController
  agents?: Record<string, AgentConfig>
  inferredServers?: Set<string>
  enabledMcpServers: Record<string, any> | undefined
  onServerConnection?: (status: string) => void
  sessionId?: string
  userMessage: string
}

export const inferMcpServers = async ({
  abortController,
  agents,
  inferredServers = new Set(),
  enabledMcpServers,
  onServerConnection,
  sessionId,
  userMessage,
}: SelectMcpServersOptions) => {
  if (!enabledMcpServers) {
    return { mcpServers: undefined, newServers: [] }
  }

  const mcpServerNames = Object.keys(enabledMcpServers).join(", ")

  log("[mcpServerSelectionAgent] Available servers:", mcpServerNames)

  log(
    "[mcpServerSelectionAgent] Already inferred:",
    Array.from(inferredServers).join(", ") || "none"
  )

  const serverCapabilities = Object.entries(enabledMcpServers)
    .map(([name, server]) => {
      const description = server.description || "No description"
      return `- ${name}: ${description}`
    })
    .join("\n")

  // Build agent capabilities section
  const agentCapabilities = agents
    ? Object.entries(agents)
        .map(([name, agent]) => {
          const description = agent.description || "No description"
          const requiredServers = agent.mcpServers || []
          return `- ${name}: ${description}${requiredServers.length > 0 ? ` (requires: ${requiredServers.join(", ")})` : ""}`
        })
        .join("\n")
    : ""

  let selectedServers: string[] = []

  /**
   * Create a custom MCP server tool.
   */
  const selectionServer = createSdkMcpServer({
    name: "mcp-router",
    version: "0.0.1",
    tools: [
      tool(
        "select_mcp_servers",
        "Select which MCP servers are needed for the user's request",
        {
          servers: z
            .array(z.string())
            .describe(
              "Array of MCP server names needed. Use exact names from the available list. Return empty array if no servers are needed."
            ),
        },
        async (args) => {
          selectedServers = args.servers.map((s) => s.trim())

          return {
            content: [
              {
                type: "text",
                text: `Selected servers: ${selectedServers.join(", ") || "none"}`,
              },
            ],
          }
        }
      ),
    ],
  })

  const routingSystemPrompt = `You are an MCP server router. Your job is to determine which MCP servers are needed for a user's request.

Available MCP servers: ${mcpServerNames}

SERVER CAPABILITIES:
${serverCapabilities}
${
  agentCapabilities
    ? `
AVAILABLE SUBAGENTS:
${agentCapabilities}

When a user request matches a subagent's domain, include that subagent's required MCP servers in your selection.
`
    : ""
}
INSTRUCTIONS:
- You do not need to respond with a friendly greeting. Your sole purpose is to return results in the form requested below.
- Intelligently infer which servers are needed based on the request context and server capabilities
- Consider if the request might invoke a subagent and include its required servers
- Match case-insensitively when user explicitly mentions server names (e.g., "github" matches "github")
- Use the select_mcp_servers tool to return your selection
- If no relevant servers are available, return an empty array

Examples:
- "Show me GitHub issues" → ["github"]
- "Show me some docs on OKRs" → ["notion"]
- "What's the weather?" → []
`

  const routingResponse = query({
    prompt: (async function* () {
      yield {
        type: "user" as const,
        session_id: sessionId || "",
        message: {
          role: "user" as const,
          content: userMessage,
        },
      } as SDKUserMessage
    })(),
    options: {
      model: "haiku",
      systemPrompt: routingSystemPrompt,
      abortController,
      mcpServers: {
        "mcp-router": selectionServer,
      },
      allowedTools: ["mcp__mcp-router__select_mcp_servers"],
      maxTurns: 1,
    },
  })

  for await (const message of routingResponse) {
    if (message.type === messageTypes.ASSISTANT) {
      log(
        "[mcpServerSelectionAgent] [messageTypes.ASSISTANT]:",
        JSON.stringify(message.message.content, null, 2)
      )
    }
  }

  log("[mcpServerSelectionAgent] Selected MCP servers:", selectedServers)

  const newServers = selectedServers.filter(
    (server) => !inferredServers.has(server.toLowerCase())
  )

  if (newServers.length > 0) {
    log(
      "[mcpServerSelectionAgent] New MCP servers to connect:",
      newServers.join(", ")
    )
  } else {
    log("[mcpServerSelectionAgent] No new MCP servers needed")
  }

  const allServers = new Set([
    ...Array.from(inferredServers),
    ...selectedServers,
  ])

  const mcpServers =
    allServers.size > 0
      ? Object.fromEntries(
          Object.entries(enabledMcpServers).filter(([name]) =>
            Array.from(allServers).some(
              (s) => s.toLowerCase() === name.toLowerCase()
            )
          )
        )
      : undefined

  log(
    "[mcpServerSelectionAgent] Final MCP servers:",
    mcpServers ? Object.keys(mcpServers).join(", ") : "none"
  )

  // Log servers selected for this turn
  log(
    "[mcpServerSelectionAgent] Servers selected for this turn:",
    newServers.length > 0 ? newServers : "none (reusing existing)"
  )

  // Log total accumulated servers
  log(
    "[mcpServerSelectionAgent] Total accumulated servers:",
    Array.from(allServers).join(", ") || "none"
  )

  // Notify about new server connections
  if (newServers.length > 0) {
    const serverList = newServers.join(", ")
    onServerConnection?.(`Connecting to ${serverList}...`)
  }

  // Update the inferred servers set with new servers
  newServers.forEach((server) => {
    inferredServers.add(server.toLowerCase())
  })

  return {
    mcpServers,
    newServers,
  }
}
