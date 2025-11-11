import { useCallback, useEffect, useRef } from "react"
import { AgentStore } from "store"
import { log } from "utils/logger"
import { messageTypes, runAgentLoop } from "utils/runAgentLoop"

export function useAgent() {
  const messageQueue = AgentStore.useStoreState((state) => state.messageQueue)
  const config = AgentStore.useStoreState((state) => state.config)
  const actions = AgentStore.useStoreActions((actions) => actions)
  const currentAssistantMessageRef = useRef("")
  const sessionIdRef = useRef<string | undefined>(undefined)
  const abortControllerRef = useRef<AbortController | undefined>(undefined)
  const connectedServersRef = useRef<Set<string>>(new Set())

  const runQuery = useCallback(
    async (userMessage: string) => {
      if (abortControllerRef.current) {
        log("[useAgent] Aborting existing query for new message:", userMessage)

        // When a new message comes in, always abort the old one and start fresh
        abortControllerRef.current.abort()
      }

      // Create fresh abort controller for this query
      const abortController = new AbortController()
      abortControllerRef.current = abortController
      actions.setAbortController(abortController)

      const streamEnabled = config.stream ?? false

      try {
        const agentLoop = runAgentLoop({
          abortController,
          config,
          connectedServers: connectedServersRef.current,
          messageQueue,
          onToolPermissionRequest: (toolName, input) => {
            actions.setPendingToolPermission({ toolName, input })
          },
          onServerConnection: (status) => {
            actions.addChatHistoryEntry({
              type: "message",
              role: "system",
              content: status,
            })
          },
          sessionId: sessionIdRef.current,
          setIsProcessing: actions.setIsProcessing,
          userMessage,
        })

        for await (const message of agentLoop) {
          if (abortController.signal.aborted) {
            log("[useAgent] Query was aborted, stopping message processing")
            return
          }

          switch (true) {
            case message.type === messageTypes.SYSTEM &&
              message.subtype === messageTypes.INIT: {
              sessionIdRef.current = message.session_id
              actions.setSessionId(message.session_id)
              actions.handleMcpServerStatus(message.mcp_servers)

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
                actions.setStats(message)
              } else {
                actions.setStats(`[agent-cli] Error: ${message.subtype}`)
              }
              actions.setIsProcessing(false)
              break
            }
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          actions.setIsProcessing(false)
          return
        }

        // Handle other errors
        if (
          error instanceof Error &&
          !error.message.includes("process aborted by user")
        ) {
          actions.setStats(`[agent-cli] ${error}`)
        }

        actions.setIsProcessing(false)
      }
    },
    [config, messageQueue, actions]
  )

  // Start listening for new messages from input
  useEffect(() => {
    const unsubscribe = messageQueue.subscribe((userMessage) => {
      setTimeout(() => {
        runQuery(userMessage)
      }, 0)
    })

    return unsubscribe
  }, [messageQueue, runQuery])
}
