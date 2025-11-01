import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import {
  LoggingMessageNotificationSchema,
  type LoggingMessageNotification,
} from "@modelcontextprotocol/sdk/types.js"
import { useEffect } from "react"
import { AgentStore } from "store"
import config from "../../mcp-client.config"

const CALL_TOOL_TIMEOUT = 600000 // 10 minutes

export const useMcpClient = () => {
  const messageQueue = AgentStore.useStoreState((state) => state.messageQueue)
  const actions = AgentStore.useStoreActions((actions) => actions)

  useEffect(() => {
    const runClient = async () => {
      try {
        const client = new Client(
          {
            name: "agent-chat-cli-client",
            version: "0.1.0",
          },
          {
            capabilities: {
              // Allow bot to ask for input
              elicitation: {},
            },
          }
        )

        client.setNotificationHandler(
          LoggingMessageNotificationSchema,
          (notification: LoggingMessageNotification) => {
            if (notification.params?.data) {
              try {
                const dataStr =
                  typeof notification.params.data === "string"
                    ? notification.params.data
                    : JSON.stringify(notification.params.data)

                const data = JSON.parse(dataStr)

                if (data.type === "tool_use") {
                  actions.addChatHistoryEntry({
                    type: "tool_use",
                    name: data.name,
                    input: data.input as Record<string, unknown>,
                  })

                  actions.addToolUse({
                    type: "tool_use",
                    name: data.name,
                    input: data.input as Record<string, unknown>,
                  })
                } else if (data.type === "mcp_servers") {
                  actions.setMcpServers(data.servers)
                } else if (data.type === "system_message") {
                  actions.addChatHistoryEntry({
                    type: "message",
                    role: "system",
                    content: data.content,
                  })
                } else if (data.type === "text_message") {
                  actions.addChatHistoryEntry({
                    type: "message",
                    role: "assistant",
                    content: data.content,
                  })
                }
              } catch {
                // noop
              }
            }
          }
        )

        const transport: StdioClientTransport | StreamableHTTPClientTransport =
          (() => {
            switch (true) {
              case config.transport === "stdio": {
                return new StdioClientTransport({
                  command: config.command,
                  args: config.args || [],
                })
              }

              case config.transport === "http" || config.transport === "sse": {
                return new StreamableHTTPClientTransport(new URL(config.url))
              }

              default: {
                throw new Error(
                  `[agent-chat-cli] Unsupported transport: ${config.transport}`
                )
              }
            }
          })()

        actions.setSessionId("mcp-client-session")

        await client.connect(transport)
        await client.setLoggingLevel("debug")
        await client.callTool(
          {
            name: "get_agent_status",
            arguments: {},
          },
          undefined,
          { timeout: CALL_TOOL_TIMEOUT }
        )

        while (true) {
          const userMessage = await messageQueue.waitForMessage()

          if (userMessage.toLowerCase() === "exit") {
            break
          }

          if (!userMessage.trim()) {
            continue
          }

          try {
            const startTime = Date.now()

            await client.callTool(
              {
                name: "ask_agent",
                arguments: {
                  query: userMessage,
                },
              },
              undefined,
              { timeout: CALL_TOOL_TIMEOUT }
            )

            const duration = Date.now() - startTime

            // Messages are already added via logging notifications during execution
            // No need to add a final message here since text_message notifications
            // already added each response as it came in

            actions.setStats(`Completed in ${(duration / 1000).toFixed(2)}s`)
            actions.setIsProcessing(false)
          } catch (error) {
            actions.setStats(
              `[agent-chat-cli] Error: ${error instanceof Error ? error.message : String(error)}`
            )
            actions.setIsProcessing(false)
          }
        }
      } catch (error) {
        actions.setStats(
          `[agent-chat-cli] Client error: ${error instanceof Error ? error.message : String(error)}`
        )
        actions.setIsProcessing(false)
      }
    }

    runClient()
  }, [])
}
