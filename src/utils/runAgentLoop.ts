import { query } from "@anthropic-ai/claude-agent-sdk"
import type { AgentChatConfig } from "store"
import { createCanUseTool } from "utils/canUseTool"
import { createSDKAgents } from "utils/createAgent"
import { getEnabledMcpServers } from "utils/getEnabledMcpServers"
import { buildSystemPrompt } from "utils/getPrompt"
import { getDisallowedTools } from "utils/getToolInfo"
import { log } from "utils/logger"
import { selectMcpServers } from "utils/mcpServerSelectionAgent"
import type { MessageQueue } from "utils/MessageQueue"

export const messageTypes = {
  ASSISTANT: "assistant",
  INIT: "init",
  RESULT: "result",
  STREAM_EVENT: "stream_event",
  SYSTEM: "system",
} as const

export const contentTypes = {
  TEXT: "text",
  TOOL_USE: "tool_use",
} as const

export interface RunAgentLoopOptions {
  abortController: AbortController
  additionalSystemPrompt?: string
  config: AgentChatConfig
  connectedServers: Set<string>
  messageQueue: MessageQueue
  onServerConnection?: (status: string) => void
  onToolPermissionRequest?: (toolName: string, input: any) => void
  sessionId?: string
  setIsProcessing?: (value: boolean) => void
  userMessage: string
}

export async function* runAgentLoop({
  abortController,
  additionalSystemPrompt,
  config,
  connectedServers,
  messageQueue,
  onServerConnection,
  onToolPermissionRequest,
  sessionId,
  setIsProcessing,
  userMessage,
}: RunAgentLoopOptions) {
  log("\n[runAgentLoop] USER:", userMessage, "\n")

  const canUseTool = createCanUseTool({
    messageQueue,
    onToolPermissionRequest,
    setIsProcessing,
  })

  const disallowedTools = getDisallowedTools(config)
  const enabledMcpServers = getEnabledMcpServers(config.mcpServers)

  const { mcpServers } = await selectMcpServers({
    abortController,
    agents: config.agents,
    connectedServers,
    enabledMcpServers,
    onServerConnection,
    sessionId,
    userMessage,
  })

  const systemPrompt = await buildSystemPrompt({
    additionalSystemPrompt,
    config,
    connectedServers,
  })

  const agents = await createSDKAgents(config.agents)

  const turnResponse = query({
    prompt: userMessage,
    options: {
      abortController,
      agents,
      canUseTool,
      disallowedTools,
      includePartialMessages: config.stream ?? false,
      mcpServers,
      model: config.model ?? "haiku",
      permissionMode: config.permissionMode ?? "default",
      resume: sessionId,
      systemPrompt,
    },
  })

  for await (const message of turnResponse) {
    if (
      message.type === messageTypes.SYSTEM &&
      message.subtype === messageTypes.INIT
    ) {
      log(
        "[runAgentLoop] [messageTypes.INIT]:",
        JSON.stringify(message, null, 2)
      )
    }

    yield message

    // If we hit a RESULT, this turn is complete
    if (message.type === messageTypes.RESULT) {
      break
    }
  }
}
