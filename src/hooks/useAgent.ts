import { query, type SDKUserMessage } from "@anthropic-ai/claude-agent-sdk"
import { useEffect, useRef } from "react"
import { mcpServers } from "../mcp.config"
import { AgentStore } from "../store"

export function useAgent() {
  const messageQueue = AgentStore.useStoreState((state) => state.messageQueue)
  const actions = AgentStore.useStoreActions((actions) => actions)
  const currentAssistantMessageRef = useRef("")

  useEffect(() => {
    async function runAgent() {
      // Build combined system prompt from MCP server prompts
      const mcpPrompts = Object.entries(mcpServers)
        .filter(([_, config]) => config.prompt)
        .map(([name, config]) => `# ${name} MCP Server\n\n${config.prompt}`)
        .join("\n\n")

      const response = query({
        prompt: generateMessages(messageQueue) as AsyncGenerator<any>,
        options: {
          model: "sonnet",
          permissionMode: "bypassPermissions",
          mcpServers,
          systemPrompt: mcpPrompts
            ? {
                type: "preset",
                preset: "claude_code",
                append: mcpPrompts,
              }
            : undefined,
        },
      })

      // Get MCP server status
      try {
        const servers = await response.mcpServerStatus()
        actions.setMcpServers(servers)
      } catch (error) {
        console.error("Failed to get MCP server status:", error)
      }

      try {
        for await (const message of response) {
          if (message.type === "system" && message.subtype === "init") {
            actions.setSessionId(message.session_id)
            actions.setMcpServers(message.mcp_servers)

            continue
          }

          if (message.type === "assistant") {
            for (const content of message.message.content) {
              if (content.type === "text") {
                actions.appendcurrentAssistantMessage(content.text)
                currentAssistantMessageRef.current += content.text
              } else if (content.type === "tool_use") {
                // Before adding tool use, flush any accumulated assistant text to chat history
                if (currentAssistantMessageRef.current) {
                  actions.addChatHistoryEntry({
                    type: "message",
                    role: "assistant",
                    content: currentAssistantMessageRef.current,
                  })
                  currentAssistantMessageRef.current = ""
                  actions.clearcurrentAssistantMessage()
                }

                // Now add the tool use to chat history
                actions.addChatHistoryEntry({
                  type: "tool_use",
                  name: content.name,
                  input: content.input as Record<string, unknown>,
                })
                // Also track for current display
                actions.addToolUse({
                  type: "tool_use",
                  name: content.name,
                  input: content.input as Record<string, unknown>,
                })
              }
            }
          } else if (message.type === "result") {
            // Flush any remaining assistant text to chat history
            const finalMessage = currentAssistantMessageRef.current
            if (finalMessage) {
              actions.addChatHistoryEntry({
                type: "message",
                role: "assistant",
                content: finalMessage,
              })
              actions.clearcurrentAssistantMessage()
              currentAssistantMessageRef.current = ""
            }

            if (!message.is_error) {
              actions.setStats(
                `✅ Completed in ${(message.duration_ms / 1000).toFixed(
                  2
                )}s | Cost: $${message.total_cost_usd.toFixed(4)} | Turns: ${
                  message.num_turns
                }`
              )
            } else {
              actions.setStats(`❌ Error: ${message.subtype}`)
            }
            actions.setIsProcessing(false)
          }
        }
      } catch (error) {
        actions.setStats(`❌ Error: ${error}`)
        actions.setIsProcessing(false)
      }
    }

    runAgent()

    return () => {
      // Cleanup
    }
  }, [messageQueue, actions])
}

const generateMessages = async function* generateMessages(
  messageQueue: { resolve: (value: string) => void }[]
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
      session_id: "",
      message: {
        role: "user" as const,
        content: userMessage,
      },
    } as SDKUserMessage
  }
}
