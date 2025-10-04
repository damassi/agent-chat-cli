import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { loadConfig } from "utils/loadConfig"
import { runAgentLoop, messageTypes } from "utils/runAgentLoop"
import { MessageQueue } from "utils/MessageQueue"

let sessionId: string | undefined

interface RunQueryOptions {
  prompt: string
  mcpServer?: McpServer
}

export const runStandaloneAgentLoop = async ({
  prompt,
  mcpServer,
}: RunQueryOptions) => {
  const config = await loadConfig()
  const messageQueue = new MessageQueue()
  const streamEnabled = config.stream ?? false

  const { response } = runAgentLoop({
    messageQueue,
    sessionId,
    config,
  })

  await new Promise((resolve) => setTimeout(resolve, 0))

  messageQueue.sendMessage(prompt)

  let fullResponse = ""
  let assistantMessage = ""

  try {
    for await (const message of response) {
      switch (true) {
        case message.type === messageTypes.SYSTEM &&
          message.subtype === messageTypes.INIT: {
          sessionId = message.session_id
          continue
        }

        case message.type === messageTypes.STREAM_EVENT: {
          if (streamEnabled) {
            const event = message.event

            if (event.type === "content_block_delta") {
              if (event.delta.type === "text_delta") {
                assistantMessage += event.delta.text
              }
            }
          }
          continue
        }

        case message.type === messageTypes.ASSISTANT: {
          for (const content of message.message.content) {
            if (content.type === "text") {
              if (!streamEnabled) {
                assistantMessage += content.text
              }
            } else if (content.type === "tool_use") {
              // Emit tool use notification if mcpServer is available
              if (mcpServer) {
                await mcpServer.sendLoggingMessage({
                  level: "info",
                  data: JSON.stringify({
                    type: "tool_use",
                    name: content.name,
                    input: content.input,
                  }),
                })
              }
            }
          }
          break
        }

        case message.type === messageTypes.RESULT: {
          if (assistantMessage) {
            fullResponse = assistantMessage
          }
          return fullResponse
        }
      }
    }
  } catch (error) {
    throw new Error(`[agent-chat-cli] Error: ${error}`)
  }

  return fullResponse
}
