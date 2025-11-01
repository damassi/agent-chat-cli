import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { loadConfig } from "utils/loadConfig"
import { log } from "utils/logger"
import { MessageQueue } from "utils/MessageQueue"
import { contentTypes, messageTypes, runAgentLoop } from "utils/runAgentLoop"

interface RunQueryOptions {
  prompt: string
  mcpServer: McpServer
  sessionId?: string
  additionalSystemPrompt?: string
  onSessionIdReceived?: (sessionId: string) => void
  existingConnectedServers?: Set<string>
}

export const runStandaloneAgentLoop = async ({
  prompt,
  mcpServer,
  sessionId,
  additionalSystemPrompt,
  onSessionIdReceived,
  existingConnectedServers,
}: RunQueryOptions) => {
  const config = await loadConfig()
  const messageQueue = new MessageQueue()
  const streamEnabled = config.stream ?? false

  const { agentLoop, connectedServers } = await runAgentLoop({
    messageQueue,
    sessionId,
    config,
    additionalSystemPrompt,
    existingConnectedServers,
    onServerConnection: async (status) => {
      await mcpServer.sendLoggingMessage({
        level: "info",
        data: JSON.stringify({
          type: "system_message",
          content: status,
        }),
      })
    },
  })

  await new Promise((resolve) => setTimeout(resolve, 0))

  messageQueue.sendMessage(prompt)

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
            connectedServers,
          }
        }
      }
    }
  } catch (error) {
    console.error(`[agent-chat-cli] [runStandaloneAgentLoop] Error: ${error}`)
  }

  return {
    response: finalResponse,
    connectedServers,
  }
}
