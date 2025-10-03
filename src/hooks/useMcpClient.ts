import { useEffect, useRef } from "react"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import {
  LoggingMessageNotificationSchema,
  type LoggingMessageNotification,
} from "@modelcontextprotocol/sdk/types.js"
import { AgentStore } from "store"
import config from "../../mcp-client.config"

export const useMcpClient = () => {
  const messageQueue = AgentStore.useStoreState((state) => state.messageQueue)
  const actions = AgentStore.useStoreActions((actions) => actions)

  useEffect(() => {
    const runClient = async () => {
      try {
        const client = new Client(
          {
            name: "agent-chat-cli-client",
            version: "1.0.0",
          },
          {
            capabilities: {
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
                }
              } catch {
                // noop
              }
            }
          }
        )

        let transport: StdioClientTransport | StreamableHTTPClientTransport =
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

        // Check to see what tools are available and update status
        await client.callTool({
          name: "get_agent_status",
          arguments: {},
        })

        // Wait for messages from the queue
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

          try {
            const startTime = Date.now()

            const result = await client.callTool({
              name: "ask_agent",
              arguments: {
                query: userMessage,
              },
            })

            const duration = Date.now() - startTime

            let responseText = ""

            if (result.content && Array.isArray(result.content)) {
              for (const item of result.content) {
                if (item.type === "text") {
                  responseText += item.text
                }
              }
            }

            if (responseText) {
              actions.addChatHistoryEntry({
                type: "message",
                role: "assistant",
                content: responseText,
              })
            }

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
