import { query, type SDKUserMessage } from "@anthropic-ai/claude-agent-sdk"
import type { AgentChatConfig } from "store"
import { buildSystemPrompt } from "utils/getPrompt"
import { createCanUseTool } from "utils/canUseTool"
import type { MessageQueue } from "utils/MessageQueue"

export const messageTypes = {
  ASSISTANT: "assistant",
  INIT: "init",
  RESULT: "result",
  STREAM_EVENT: "stream_event",
  SYSTEM: "system",
} as const

export const generateMessages = async function* (
  messageQueue: MessageQueue,
  sessionId?: string
) {
  while (true) {
    const userMessage = await messageQueue.waitForMessage()

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
  messageQueue: MessageQueue
  sessionId?: string
  config: AgentChatConfig
  abortController?: AbortController
  onToolPermissionRequest?: (toolName: string, input: any) => void
  setIsProcessing?: (value: boolean) => void
}

export const createAgentQuery = (options: CreateAgentQueryOptions) => {
  const {
    messageQueue,
    sessionId,
    config,
    abortController,
    onToolPermissionRequest,
    setIsProcessing,
  } = options
  const mcpPrompts = buildSystemPrompt(config.mcpServers)
  const streamEnabled = config.stream ?? false

  const response = query({
    prompt: generateMessages(messageQueue, sessionId),
    options: {
      model: "claude-3-7-sonnet-latest",
      permissionMode: config.permissionMode || "default",
      mcpServers: config.mcpServers,
      includePartialMessages: streamEnabled,
      abortController,
      systemPrompt: mcpPrompts
        ? {
            type: "preset",
            preset: "claude_code",
            append: mcpPrompts,
          }
        : undefined,
      canUseTool: onToolPermissionRequest
        ? createCanUseTool({
            messageQueue,
            onToolPermissionRequest,
            setIsProcessing,
          })
        : undefined,
    },
  })

  return {
    response,
  }
}
