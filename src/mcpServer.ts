import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"
import { loadConfig } from "./utils/loadConfig"
import { createAgentQuery, messageTypes } from "./utils/runAgent"

const mcpServer = new McpServer({
  name: "agent-chat-cli",
  version: "0.1.0",
})

let sessionId: string | undefined
let config: Awaited<ReturnType<typeof loadConfig>>

const runQuery = async (prompt: string) => {
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
    throw new Error(`Agent error: ${error}`)
  }

  return fullResponse
}

mcpServer.registerTool(
  "query_agent",
  {
    description:
      "Query the Agent Chat CLI agent. The agent has access to all configured MCP servers and can use their tools.",
    inputSchema: {
      prompt: z.string().min(1).describe("The prompt to send to the agent"),
    },
  },
  async ({ prompt }) => {
    const result = await runQuery(prompt)

    return {
      content: [
        {
          type: "text",
          text: result,
        },
      ],
    }
  }
)

export const runServer = async () => {
  try {
    config = await loadConfig()

    const transport = new StdioServerTransport()
    await mcpServer.connect(transport)

    console.log("\n[agent-chat-cli] MCP Server running on stdio\n")
  } catch (error) {
    console.error("[agent-chat-cli] Fatal error running server:", error)
    process.exit(1)
  }
}

runServer()
