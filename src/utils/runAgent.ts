import { query, type SDKUserMessage } from "@anthropic-ai/claude-agent-sdk"
import type { AgentChatConfig } from "store"
import { buildSystemPrompt } from "utils/getPrompt"

export const messageTypes = {
  ASSISTANT: "assistant",
  INIT: "init",
  RESULT: "result",
  STREAM_EVENT: "stream_event",
  SYSTEM: "system",
} as const

export const generateMessages = async function* (
  messageQueue: { resolve: (value: string) => void }[],
  sessionId?: string
) {
  while (true) {
    const userMessage = await new Promise<string>((resolve) => {
      messageQueue.push({ resolve })
    })

    if (userMessage.toLowerCase() === "exit") {
      break
    }

    if (!userMessage.trim()) {
      continue
    }

    yield {
      type: "user" as const,
      session_id: sessionId || "",
      message: {
        role: "user" as const,
        content: userMessage,
      },
    } as SDKUserMessage
  }
}

export interface CreateAgentQueryOptions {
  messageQueue: { resolve: (value: string) => void }[]
  sessionId?: string
  config: AgentChatConfig
  onToolPermissionRequest?: (toolName: string, input: any) => void
}

export const createAgentQuery = (options: CreateAgentQueryOptions) => {
  const { messageQueue, sessionId, config, onToolPermissionRequest } = options
  const mcpPrompts = buildSystemPrompt(config.mcpServers)
  const streamEnabled = config.stream ?? false

  const response = query({
    prompt: generateMessages(messageQueue, sessionId),
    options: {
      model: "sonnet",
      permissionMode: "default",
      mcpServers: config.mcpServers,
      includePartialMessages: streamEnabled,
      systemPrompt: mcpPrompts
        ? {
            type: "preset",
            preset: "claude_code",
            append: mcpPrompts,
          }
        : undefined,
      canUseTool: onToolPermissionRequest
        ? async (toolName: string, input: any) => {
            // Notify UI about the permission request
            onToolPermissionRequest(toolName, input)

            // Wait for user decision via messageQueue
            const userResponse = await new Promise<string>((resolve) => {
              messageQueue.push({ resolve })
            })

            const response = userResponse.toLowerCase().trim()

            // Enter pressed (empty) or explicit "y"/"yes"/"allow"
            if (!response || ["y", "yes", "allow"].includes(response)) {
              return { behavior: "allow" as const, updatedInput: input }
            }

            // ESC or explicit "n"/"no"/"deny"
            if (["n", "no", "deny"].includes(response)) {
              return {
                behavior: "deny" as const,
                message: "User denied permission",
                interrupt: true,
              }
            }

            // Any other input = modified input
            try {
              const updatedInput = JSON.parse(response)
              return { behavior: "allow" as const, updatedInput }
            } catch {
              // If not valid JSON, treat as text modification
              return {
                behavior: "allow" as const,
                updatedInput: { value: response },
              }
            }
          }
        : undefined,
    },
  })

  return {
    response,
  }
}
