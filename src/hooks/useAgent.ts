import { useEffect, useRef } from "react"
import { AgentStore } from "store"
import { useMcpServers } from "hooks/useMcpServers"
import { createAgentQuery, messageTypes } from "utils/runAgent"

export function useAgent() {
  const messageQueue = AgentStore.useStoreState((state) => state.messageQueue)
  const sessionId = AgentStore.useStoreState((state) => state.sessionId)
  const config = AgentStore.useStoreState((state) => state.config)
  const actions = AgentStore.useStoreActions((actions) => actions)
  const currentAssistantMessageRef = useRef("")
  const { initMcpServers } = useMcpServers()

  useEffect(() => {
    const streamEnabled = config.stream ?? false

    async function runAgent() {
      const { response } = createAgentQuery({
        messageQueue,
        sessionId,
        config,
        onToolPermissionRequest: (toolName, input) => {
          actions.setPendingToolPermission({ toolName, input })
        },
        setIsProcessing: actions.setIsProcessing,
      })

      await initMcpServers(response)

      try {
        for await (const message of response) {
          switch (true) {
            case message.type === messageTypes.SYSTEM &&
              message.subtype === messageTypes.INIT: {
              actions.setSessionId(message.session_id)
              actions.setMcpServers(message.mcp_servers)
              continue
            }

            case message.type === messageTypes.STREAM_EVENT: {
              if (streamEnabled) {
                const event = message.event

                if (event.type === "content_block_delta") {
                  if (event.delta.type === "text_delta") {
                    actions.appendCurrentAssistantMessage(event.delta.text)
                    currentAssistantMessageRef.current += event.delta.text
                  }
                }
              }
              continue
            }

            case message.type === messageTypes.ASSISTANT: {
              for (const content of message.message.content) {
                // Streaming disabled. Append text directly
                if (content.type === "text") {
                  if (!streamEnabled) {
                    actions.appendCurrentAssistantMessage(content.text)
                    currentAssistantMessageRef.current += content.text
                  }
                } else if (content.type === "tool_use") {
                  if (currentAssistantMessageRef.current) {
                    // Before adding tool use, flush any accumulated assistant text
                    // to chat history
                    actions.addChatHistoryEntry({
                      type: "message",
                      role: "assistant",
                      content: currentAssistantMessageRef.current,
                    })

                    currentAssistantMessageRef.current = ""
                    actions.clearCurrentAssistantMessage()
                  }

                  actions.addChatHistoryEntry({
                    type: "tool_use",
                    name: content.name,
                    input: content.input as Record<string, unknown>,
                  })

                  actions.addToolUse({
                    type: "tool_use",
                    name: content.name,
                    input: content.input as Record<string, unknown>,
                  })
                }
              }
              break
            }

            case message.type === messageTypes.RESULT: {
              const finalMessage = currentAssistantMessageRef.current

              if (finalMessage) {
                actions.addChatHistoryEntry({
                  type: "message",
                  role: "assistant",
                  content: finalMessage,
                })

                actions.clearCurrentAssistantMessage()
                currentAssistantMessageRef.current = ""
              }

              if (!message.is_error) {
                actions.setStats(
                  `Completed in ${(message.duration_ms / 1000).toFixed(
                    2
                  )}s | Cost: $${message.total_cost_usd.toFixed(4)} | Turns: ${
                    message.num_turns
                  }`
                )
              } else {
                actions.setStats(`[agent-chat-cli] Error: ${message.subtype}`)
              }
              actions.setIsProcessing(false)
              break
            }
          }
        }
      } catch (error) {
        actions.setStats(`[agent-chat-cli] Error: ${error}`)
        actions.setIsProcessing(false)
      }
    }

    runAgent()
  }, [])
}
