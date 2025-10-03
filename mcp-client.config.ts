export type McpClientConfig =
  | {
      transport: "stdio"
      command: string
      args?: string[]
    }
  | {
      transport: "http" | "sse"
      url: string
    }

const config: McpClientConfig = {
  transport: "stdio",
  command: "bun",
  args: ["run", "server"],

  // Or connect to your MCP server via HTTP
  // transport: "http",
  // url: "http://localhost:3000/mcp",
}

export default config
