import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js"
import { randomUUID } from "node:crypto"
import { loadConfig } from "utils/loadConfig"
import { getMcpServer } from "mcp/utils/getMcpServer"
import express from "express"
import cors from "cors"

const PORT = 3000

export const main = async () => {
  await loadConfig()

  const app = express()

  const transports: Record<string, StreamableHTTPServerTransport> = {}

  app.use(express.json())

  app.use(
    cors({
      origin: "*",
      exposedHeaders: ["Mcp-Session-Id"],
    })
  )

  app.post("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined

    if (sessionId) {
      console.log(
        `[agent-chat-cli] Received MCP request for session: ${sessionId}`
      )
    } else {
      console.log("[agent-chat-cli] New MCP request")
    }

    try {
      let transport: StreamableHTTPServerTransport

      if (sessionId && transports[sessionId]) {
        transport = transports[sessionId]
      } else if (!sessionId && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (newSessionId) => {
            console.log(
              `[agent-chat-cli] Session initialized with ID: ${newSessionId}`
            )

            transports[newSessionId] = transport
          },
        })

        transport.onclose = () => {
          const sid = transport.sessionId

          if (sid && transports[sid]) {
            console.log(`[agent-chat-cli] Transport closed for session ${sid}`)
            delete transports[sid]
          }
        }

        const server = getMcpServer()

        await server.connect(transport)
        await transport.handleRequest(req, res, req.body)

        return
      } else {
        res.status(400).json({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Bad Request: No valid session ID provided",
          },
          id: null,
        })
        return
      }

      await transport.handleRequest(req, res, req.body)
    } catch (error) {
      console.error("[agent-chat-cli] Error handling MCP request:", error)

      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal server error",
          },
          id: null,
        })
      }
    }
  })

  app.get("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined

    if (!sessionId || !transports[sessionId]) {
      res.status(400).send("Invalid or missing session ID")
      return
    }

    const lastEventId = req.headers["last-event-id"]

    if (lastEventId) {
      console.log(
        `[agent-chat-cli] Client reconnecting with Last-Event-ID: ${lastEventId}`
      )
    } else {
      console.log(
        `[agent-chat-cli] Establishing new HTTP stream for session ${sessionId}`
      )
    }

    const transport = transports[sessionId]
    await transport.handleRequest(req, res)
  })

  app.delete("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined

    if (!sessionId || !transports[sessionId]) {
      res.status(400).send("Invalid or missing session ID")
      return
    }

    console.log(
      `[agent-chat-cli] Received session termination request for session ${sessionId}`
    )

    try {
      const transport = transports[sessionId]
      await transport.handleRequest(req, res)
    } catch (error) {
      console.error(
        "[agent-chat-cli] Error handling session termination:",
        error
      )

      if (!res.headersSent) {
        res.status(500).send("Error processing session termination")
      }
    }
  })

  app.listen(PORT, () => {
    console.log(
      `\n[agent-chat-cli] MCP HTTP Server running on port http://localhost:${PORT}\n`
    )
  })

  process.on("SIGINT", async () => {
    console.log("[agent-chat-cli] Shutting down server...")

    for (const sessionId in transports) {
      try {
        console.log(
          `[agent-chat-cli] Closing transport for session ${sessionId}`
        )

        await transports[sessionId]?.close()
        delete transports[sessionId]
      } catch (error) {
        console.error(
          `[agent-chat-cli] Error closing transport for session ${sessionId}:`,
          error
        )
      }
    }

    console.log("[agent-chat-cli] Server shutdown complete")
    process.exit(0)
  })
}

try {
  main()
} catch (error) {
  console.error("[agent-chat-cli] Fatal error starting HTTP server:", error)
  process.exit(1)
}
