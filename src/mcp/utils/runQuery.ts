import { loadConfig } from "utils/loadConfig"
import { createAgentQuery, messageTypes } from "utils/runAgent"

let sessionId: string | undefined

export const runQuery = async (prompt: string) => {
  const config = await loadConfig()
  const messageQueue: { resolve: (value: string) => void }[] = []
  const streamEnabled = config.stream ?? false

  const { response } = createAgentQuery({
    messageQueue,
    sessionId,
    config,
  })

  await new Promise((resolve) => setTimeout(resolve, 0))

  if (messageQueue.length > 0) {
    const item = messageQueue.shift()

    if (item) {
      item.resolve(prompt)
    }
  }

  let fullResponse = ""
  let currentAssistantMessage = ""

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
                currentAssistantMessage += event.delta.text
              }
            }
          }
          continue
        }

        case message.type === messageTypes.ASSISTANT: {
          for (const content of message.message.content) {
            if (content.type === "text") {
              if (!streamEnabled) {
                currentAssistantMessage += content.text
              }
            }
          }
          break
        }

        case message.type === messageTypes.RESULT: {
          if (currentAssistantMessage) {
            fullResponse = currentAssistantMessage
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
