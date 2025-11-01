import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js"
import cors from "cors"
import express from "express"
import { getMcpServer } from "mcp/getMcpServer"
import { randomUUID } from "node:crypto"
import { loadConfig } from "utils/loadConfig"
import { log } from "utils/logger"

const PORT = 8080

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

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" })
  })

  app.post("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined

    if (sessionId) {
      log(`Received MCP request for session: ${sessionId}`)
    } else {
      log("New MCP request")
    }

    try {
      let transport: StreamableHTTPServerTransport

      if (sessionId && transports[sessionId]) {
        transport = transports[sessionId]
      } else if (sessionId && !transports[sessionId]) {
        log(`[/mcp POST] Session not found: ${sessionId}`)

        // Per MCP spec
        res.status(404).json({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Session not found",
          },
          id: null,
        })
        return
      } else if (!sessionId && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (newSessionId) => {
            log(`[/mcp POST] Session initialized with ID: ${newSessionId}`)

            transports[newSessionId] = transport
          },
        })

        transport.onclose = () => {
          const sid = transport.sessionId

          if (sid && transports[sid]) {
            log(`[onclose] Transport closed for session ${sid}`)
            delete transports[sid]
          }
        }

        const server = getMcpServer()

        // Connect
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

      // Req / Res handlers
      await transport.handleRequest(req, res, req.body)
    } catch (error) {
      console.error("[agent-cli] Error handling MCP request:", error)

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
      log(`[/mcp GET] Session not found: ${sessionId}`)

      res.status(404).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Session not found",
        },
        id: null,
      })

      return
    }

    const lastEventId = req.headers["last-event-id"]

    if (lastEventId) {
      log(`[/mcp GET] Client reconnecting with Last-Event-ID: ${lastEventId}`)
    } else {
      log(`[/mcp GET] Establishing new HTTP stream for session ${sessionId}`)
    }

    // Clean up when stream connection closes. This forces session cleanup so
    // next request (from existing thread) gets 404 and recreates session with
    // fresh HTTP stream.
    res.on("close", () => {
      log(`[/mcp GET] Stream closed for session ${sessionId}`)

      if (transports[sessionId]) {
        log(`[/mcp GET] Cleaning up session ${sessionId}`)
        delete transports[sessionId]
      }
    })

    const transport = transports[sessionId]
    await transport.handleRequest(req, res)
  })

  app.delete("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined

    if (!sessionId || !transports[sessionId]) {
      log(`[/mcp DELETE] Session not found: ${sessionId}`)

      res.status(404).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Session not found",
        },
        id: null,
      })

      return
    }

    log(`[/mcp DELETE] Deleting session: ${sessionId}`)

    try {
      const transport = transports[sessionId]
      await transport.handleRequest(req, res)
    } catch (error) {
      console.log(
        "[agent-cli] [/mcp DELETE] [ERROR] Error deleting session:",
        error
      )

      if (!res.headersSent) {
        res.status(500).send("Error processing session termination")
      }
    }
  })

  app.listen(PORT, () => {
    console.log(
      `\n[agent-cli] MCP HTTP Server running on port http://localhost:${PORT}\n`
    )
  })

  process.on("SIGINT", async () => {
    console.log("[agent-cli] Shutting down server...")

    for (const sessionId in transports) {
      try {
        console.log(`[agent-cli] Closing transport for session ${sessionId}`)

        await transports[sessionId]?.close()
        delete transports[sessionId]
      } catch (error) {
        console.error(
          `[agent-cli] Error closing transport for session ${sessionId}:`,
          error
        )
      }
    }

    console.log("[agent-cli] Server shutdown complete.")
    process.exit(0)
  })
}

try {
  main()
} catch (error) {
  console.error("[agent-cli] Fatal error starting HTTP server:", error)
  process.exit(1)
}
