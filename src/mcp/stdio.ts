import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { loadConfig } from "utils/loadConfig"
import { getMcpServer } from "mcp/utils/getMcpServer"

export const main = async () => {
  try {
    await loadConfig()
    const mcpServer = getMcpServer()

    const transport = new StdioServerTransport()
    await mcpServer.connect(transport)

    console.error("\n[agent-chat-cli] MCP Server running on stdio\n")
  } catch (error) {
    console.error("[agent-chat-cli] Fatal error running server:", error)
    process.exit(1)
  }
}

main()
