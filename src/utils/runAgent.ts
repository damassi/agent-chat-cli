import { query, type SDKUserMessage } from "@anthropic-ai/claude-agent-sdk"
import type { AgentChatConfig } from "../store"
import { buildSystemPrompt } from "../utils/getPrompt"

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
}

export const createAgentQuery = (options: CreateAgentQueryOptions) => {
  const { messageQueue, sessionId, config } = options
  const mcpPrompts = buildSystemPrompt(config.mcpServers)
  const streamEnabled = config.stream ?? false

  const response = query({
    prompt: generateMessages(messageQueue, sessionId),
    options: {
      model: "sonnet",
      permissionMode: "bypassPermissions",
      mcpServers: config.mcpServers,
      includePartialMessages: streamEnabled,
      systemPrompt: mcpPrompts
        ? {
            type: "preset",
            preset: "claude_code",
            append: mcpPrompts,
          }
        : undefined,
    },
  })

  return {
    response,
  }
}
