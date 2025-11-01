import { query, type SDKUserMessage } from "@anthropic-ai/claude-agent-sdk"
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
  abortControllerRef?: { current: AbortController | undefined }
  config: AgentChatConfig
  messageQueue: MessageQueue
  sessionId?: string
  additionalSystemPrompt?: string
  onToolPermissionRequest?: (toolName: string, input: any) => void
  onServerConnection?: (status: string) => void
  setIsProcessing?: (value: boolean) => void
  existingConnectedServers?: Set<string>
}

export const runAgentLoop = async ({
  abortControllerRef,
  config,
  messageQueue,
  onToolPermissionRequest,
  onServerConnection,
  sessionId: initialSessionId,
  additionalSystemPrompt,
  setIsProcessing,
  existingConnectedServers,
}: RunAgentLoopOptions) => {
  const canUseTool = createCanUseTool({
    messageQueue,
    onToolPermissionRequest,
    setIsProcessing,
  })

  const disallowedTools = getDisallowedTools(config)
  const enabledMcpServers = getEnabledMcpServers(config.mcpServers)

  let currentSessionId = initialSessionId
  const connectedServers = existingConnectedServers ?? new Set<string>()

  async function* agentLoop() {
    while (true) {
      const userMessage = await messageQueue.waitForMessage()

      log("\n[runAgentLoop] USER:", userMessage, "\n")

      if (userMessage.toLowerCase() === "exit") {
        break
      }

      if (!userMessage.trim()) {
        continue
      }

      const getSystemPrompt = async () => {
        return await buildSystemPrompt(
          config,
          additionalSystemPrompt,
          connectedServers
        )
      }

      const { mcpServers } = await selectMcpServers({
        userMessage,
        enabledMcpServers,
        agents: config.agents,
        alreadyConnectedServers: connectedServers,
        sessionId: currentSessionId,
        abortController: abortControllerRef?.current,
        onServerConnection,
      })

      const systemPrompt = await getSystemPrompt()
      const agents = await createSDKAgents(config.agents)

      try {
        const turnResponse = query({
          prompt: (async function* () {
            yield {
              type: "user" as const,
              session_id: currentSessionId || "",
              message: {
                role: "user" as const,
                content: userMessage,
              },
            } as SDKUserMessage
          })(),
          options: {
            model: config.model ?? "haiku",
            permissionMode: config.permissionMode ?? "default",
            includePartialMessages: config.stream ?? false,
            mcpServers,
            agents,
            abortController: abortControllerRef?.current,
            canUseTool,
            systemPrompt,
            disallowedTools,
            resume: currentSessionId,
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

            currentSessionId = message.session_id
          }

          yield message

          // If we hit a RESULT, this turn is complete
          if (message.type === messageTypes.RESULT) {
            break
          }
        }
      } catch (error) {
        console.log("[ERROR] [runAgentLoop] Query aborted or failed:", error)

        // Continue to next message
      }
    }
  }

  return {
    agentLoop: agentLoop(),
    connectedServers,
  }
}
