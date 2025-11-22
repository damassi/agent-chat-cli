import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { McpServerStatus } from "store"
import { loadConfig } from "utils/loadConfig"
import { log } from "utils/logger"
import { MessageQueue } from "utils/MessageQueue"
import { contentTypes, messageTypes, runAgentLoop } from "utils/runAgentLoop"

interface RunQueryOptions {
  additionalSystemPrompt?: string
  existingInferredServers?: Set<string>
  existingMcpServers?: McpServerStatus[]
  mcpServer: McpServer
  onSessionIdReceived?: (sessionId: string) => void
  prompt: string
  sessionId?: string
}

export const runStandaloneAgentLoop = async ({
  additionalSystemPrompt,
  existingInferredServers,
  existingMcpServers,
  mcpServer,
  onSessionIdReceived,
  prompt,
  sessionId,
}: RunQueryOptions) => {
  const config = await loadConfig()
  const messageQueue = new MessageQueue()
  const streamEnabled = config.stream ?? false

  const inferredServers = existingInferredServers ?? new Set<string>()
  const abortController = new AbortController()

  const agentLoop = runAgentLoop({
    abortController,
    additionalSystemPrompt,
    config,
    inferredServers,
    mcpServers: existingMcpServers,
    messageQueue,
    onServerConnection: async (status) => {
      await mcpServer.sendLoggingMessage({
        level: "info",
        data: JSON.stringify({
          type: "system_message",
          content: status,
        }),
      })
    },
    sessionId,
    userMessage: prompt,
  })

  let finalResponse = ""
  let assistantMessage = ""

  try {
    for await (const message of agentLoop) {
      switch (true) {
        case message.type === messageTypes.SYSTEM &&
          message.subtype === messageTypes.INIT: {
          log(
            "[runStandaloneAgentLoop] [messageTypes.INIT]:\n",
            JSON.stringify(message, null, 2)
          )

          if (onSessionIdReceived) {
            onSessionIdReceived(message.session_id)
          }
          continue
        }

        case message.type === messageTypes.STREAM_EVENT: {
          if (streamEnabled) {
            const event = message.event

            if (event.type === "content_block_delta") {
              if (event.delta.type === "text_delta") {
                assistantMessage += event.delta.text
                finalResponse += event.delta.text
              }
            } else if (
              event.type === "content_block_stop" &&
              assistantMessage
            ) {
              // Flush text when content block ends (before potential tool use)
              await mcpServer.sendLoggingMessage({
                level: "info",
                data: JSON.stringify({
                  type: "text_message",
                  content: assistantMessage,
                }),
              })
              assistantMessage = ""
            }
          }
          continue
        }

        case message.type === messageTypes.ASSISTANT: {
          for (const content of message.message.content) {
            log(
              "[runStandaloneAgentLoop] [messageTypes.ASSISTANT]:\n",
              JSON.stringify(content, null, 2)
            )

            switch (true) {
              case content.type === contentTypes.TEXT: {
                if (!streamEnabled) {
                  assistantMessage += content.text
                  finalResponse += content.text
                }
                break
              }

              case content.type === contentTypes.TOOL_USE: {
                if (assistantMessage) {
                  await mcpServer.sendLoggingMessage({
                    level: "info",
                    data: JSON.stringify({
                      type: "text_message",
                      content: assistantMessage,
                    }),
                  })

                  // Flush after tool use
                  assistantMessage = ""
                }

                await mcpServer.sendLoggingMessage({
                  level: "info",
                  data: JSON.stringify({
                    type: "tool_use",
                    name: content.name,
                    input: content.input,
                  }),
                })

                break
              }
            }
          }

          break
        }

        case message.type === messageTypes.RESULT: {
          if (!streamEnabled) {
            if (assistantMessage) {
              await mcpServer.sendLoggingMessage({
                level: "info",
                data: JSON.stringify({
                  type: "text_message",
                  content: assistantMessage,
                }),
              })
            }
          }

          return {
            response: finalResponse,
            inferredServers,
          }
        }
      }
    }
  } catch (error) {
    console.error(`[agent-cli] [runStandaloneAgentLoop] Error: ${error}`)
  }

  return {
    response: finalResponse,
    inferredServers,
  }
}
