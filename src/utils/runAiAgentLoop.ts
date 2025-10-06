import { openai } from "@ai-sdk/openai"
import { experimental_createMCPClient, streamText } from "ai"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import type { AgentChatConfig } from "store"
import { buildSystemPrompt } from "utils/getPrompt"
import type { MessageQueue } from "utils/MessageQueue"

export const messageTypes = {
  ASSISTANT: "assistant",
  INIT: "init",
  RESULT: "result",
  STREAM_EVENT: "stream_event",
  SYSTEM: "system",
} as const

export interface RunAiAgentLoopOptions {
  abortController?: AbortController
  config: AgentChatConfig
  messageQueue: MessageQueue
  sessionId?: string
  onToolPermissionRequest?: (toolName: string, input: any) => void
  setIsProcessing?: (value: boolean) => void
}

export const runAiAgentLoop = ({
  abortController,
  config,
  messageQueue,
}: RunAiAgentLoopOptions) => {
  const systemPrompt = buildSystemPrompt(config)

  // Create an async generator that adapts AI SDK to the expected format
  const response = (async function* () {
    const mcpClients: Array<{ name: string; client: any }> = []
    const allTools: Record<string, any> = {}
    const startTime = Date.now()

    try {
      // Connect to all configured MCP servers
      for (const [serverName, serverConfig] of Object.entries(
        config.mcpServers || {}
      )) {
        try {
          // Only handle stdio transport for now
          if (!serverConfig.type || serverConfig.type === "stdio") {
            const transport = new StdioClientTransport({
              command: (serverConfig as any).command,
              args: (serverConfig as any).args || [],
              env: (serverConfig as any).env,
              stderr: "pipe", // Capture stderr output
            })

            // Listen to stderr stream from the MCP server process
            const stderrStream = transport.stderr
            if (stderrStream) {
              stderrStream.on("data", (chunk: Buffer) => {
                const message = chunk.toString().trim()
                if (message) {
                  // Filter out noisy mcp-remote logs
                  const isNoisyLog =
                    message.includes("Using automatically selected") ||
                    message.includes("Using custom headers") ||
                    message.includes("Using existing client port") ||
                    message.includes("Using transport strategy") ||
                    message.includes("Connected to remote server") ||
                    message.includes("Local STDIO server running") ||
                    message.includes("Proxy established") ||
                    message.includes("Press Ctrl+C to exit") ||
                    message.includes("[Local→Remote]") ||
                    message.includes("[Remote→Local]") ||
                    message.includes("Connecting to remote server") ||
                    message.includes('"jsonrpc"') || // Filter JSON-RPC protocol messages
                    message.includes('"method"') ||
                    message.includes('"params"') ||
                    (message.startsWith("[") && /^\[\d+\]/.test(message)) // Filter [PID] lines

                  if (!isNoisyLog) {
                    console.error(`[MCP ${serverName}] ${message}`)
                  }
                }
              })
            }

            const client = await experimental_createMCPClient({ transport })
            mcpClients.push({ name: serverName, client })

            // Get tools from this server
            const tools = await client.tools()
            Object.assign(allTools, tools)
          } else {
            console.warn(
              `MCP server ${serverName} uses unsupported transport type: ${serverConfig.type}`
            )
          }
        } catch (error) {
          console.error(`Failed to connect to MCP server ${serverName}:`, error)
        }
      }

      // Send init message (simplified - no actual MCP server statuses yet)
      yield {
        type: messageTypes.SYSTEM,
        subtype: messageTypes.INIT,
        session_id: crypto.randomUUID(),
        mcp_servers: Object.keys(config.mcpServers || {}).map((name) => ({
          name,
          status: "connected",
        })),
      }

      // Get the first user message
      const userMessage = await messageQueue.waitForMessage()

      if (userMessage.toLowerCase() === "exit" || !userMessage.trim()) {
        return
      }

      // Create the stream with all tools
      const result = streamText({
        model: openai("gpt-4.1"),
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userMessage,
          },
        ],
        tools: Object.keys(allTools).length > 0 ? allTools : undefined,
        abortSignal: abortController?.signal,
      })

      // Stream the response
      const streamEnabled = config.stream ?? false
      let fullText = ""
      const toolUses: any[] = []

      for await (const chunk of result.textStream) {
        if (streamEnabled) {
          // Yield stream events for real-time updates
          yield {
            type: messageTypes.STREAM_EVENT,
            event: {
              type: "content_block_delta",
              delta: {
                type: "text_delta",
                text: chunk,
              },
            },
          }
        }
        fullText += chunk
      }

      // Wait for final result to get tool calls
      const finalResult = await result
      const toolCalls = await finalResult.toolCalls

      // Extract tool uses from the final result
      if (toolCalls && toolCalls.length > 0) {
        for (const toolCall of toolCalls) {
          toolUses.push({
            type: "tool_use",
            name: toolCall.toolName,
            input: (toolCall as any).args || {},
          })
        }
      }

      // Yield assistant message
      const content: any[] = []
      if (fullText) {
        content.push({
          type: "text",
          text: fullText,
        })
      }
      if (toolUses.length > 0) {
        content.push(...toolUses)
      }

      if (content.length > 0) {
        yield {
          type: messageTypes.ASSISTANT,
          message: {
            role: "assistant",
            content,
          },
        }
      }

      // Yield result message
      const endTime = Date.now()
      yield {
        type: messageTypes.RESULT,
        is_error: false,
        duration_ms: endTime - startTime,
        total_cost_usd: 0, // AI SDK doesn't provide cost info easily
        num_turns: 1,
      }

      // Clean up MCP clients
      await Promise.all(mcpClients.map(({ client }) => client.close()))
    } catch (error) {
      // Clean up on error
      await Promise.all(mcpClients.map(({ client }) => client.close()))
      throw error
    }
  })()

  return {
    response,
  }
}
