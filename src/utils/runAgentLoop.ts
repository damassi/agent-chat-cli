import { query, type SDKUserMessage } from "@anthropic-ai/claude-agent-sdk"
import type { AgentChatConfig } from "store"
import { buildSystemPrompt } from "utils/getPrompt"
import { createCanUseTool } from "utils/canUseTool"
import { getDisallowedTools } from "utils/getToolInfo"
import type { MessageQueue } from "utils/MessageQueue"

export const messageTypes = {
  ASSISTANT: "assistant",
  INIT: "init",
  RESULT: "result",
  STREAM_EVENT: "stream_event",
  SYSTEM: "system",
} as const

export interface RunAgentLoopOptions {
  abortController?: AbortController
  config: AgentChatConfig
  messageQueue: MessageQueue
  sessionId?: string
  onToolPermissionRequest?: (toolName: string, input: any) => void
  setIsProcessing?: (value: boolean) => void
}

export const runAgentLoop = ({
  abortController,
  config,
  messageQueue,
  onToolPermissionRequest,
  sessionId,
  setIsProcessing,
}: RunAgentLoopOptions) => {
  const systemPrompt = buildSystemPrompt(config)

  const canUseTool = createCanUseTool({
    messageQueue,
    onToolPermissionRequest,
    setIsProcessing,
  })

  const disallowedTools = getDisallowedTools(config)

  const response = query({
    prompt: startConversation(messageQueue, sessionId),
    options: {
      model: "haiku",
      permissionMode: config.permissionMode ?? "default",
      includePartialMessages: config.stream ?? false,
      mcpServers: config.mcpServers,
      abortController,
      canUseTool,
      systemPrompt,
      disallowedTools,
    },
  })

  return {
    response,
  }
}

const startConversation = async function* (
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
