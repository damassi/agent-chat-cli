import { query, type SDKUserMessage } from "@anthropic-ai/claude-agent-sdk"
import { useEffect, useRef } from "react"
import { AgentStore } from "../store"
import { buildSystemPrompt } from "../utils/getPrompt"
import { useMcpServers } from "./useMcpServers"

export function useAgent() {
  const messageQueue = AgentStore.useStoreState((state) => state.messageQueue)
  const sessionId = AgentStore.useStoreState((state) => state.sessionId)
  const config = AgentStore.useStoreState((state) => state.config)
  const actions = AgentStore.useStoreActions((actions) => actions)
  const currentAssistantMessageRef = useRef("")
  const { initMcpServers } = useMcpServers()

  useEffect(() => {
    const mcpServers = config.mcpServers
    const streamEnabled = config.stream ?? false

    async function runAgent() {
      const mcpPrompts = buildSystemPrompt(mcpServers)

      const response = query({
        prompt: generateMessages(
          messageQueue,
          sessionId
        ) as AsyncGenerator<any>,
        options: {
          model: "sonnet",
          permissionMode: "bypassPermissions",
          mcpServers,
          includePartialMessages: streamEnabled,
          systemPrompt: mcpPrompts
            ? {
                type: "preset",
                preset: "claude_code",
                append: mcpPrompts,
              }
            : undefined,
        },
      })

      await initMcpServers(response)

      try {
        for await (const message of response) {
          if (message.type === "system" && message.subtype === "init") {
            actions.setSessionId(message.session_id)
            actions.setMcpServers(message.mcp_servers)

            continue
          }

          // Streaming
          if (message.type === "stream_event") {
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

          if (message.type === "assistant") {
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
          } else if (message.type === "result") {
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
          }
        }
      } catch (error) {
        actions.setStats(`[agent-chat-cli] Error: ${error}`)
        actions.setIsProcessing(false)
      }
    }

    runAgent()
  }, [messageQueue, actions, config])
}

const generateMessages = async function* generateMessages(
  messageQueue: { resolve: (value: string) => void }[],
  sessionId?: string
) {
  while (true) {
    const userMessage = await new Promise<string>((resolve) => {
      messageQueue.push({ resolve })
    })

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
