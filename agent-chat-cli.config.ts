import type { McpServerConfig } from "@anthropic-ai/claude-agent-sdk"
import { getPrompt } from "./src/utils/getPrompt"

interface AgentChatConfig {
  mcpServers: Record<
    string,
    McpServerConfig & {
      prompt?: string
    }
  >
}

const config: AgentChatConfig = {
  mcpServers: {
    artsymcp: {
      command: "npx",
      args: [
        "mcp-remote@0.1.29",
        "https://mcp.stg.artsy.systems/mcp",
        "--header",
        `x-access-token:${process.env.ARTSY_MCP_X_ACCESS_TOKEN}`,
        "--header",
        `x-user-id:${process.env.ARTSY_MCP_X_USER_ID}`,
      ],
      env: {
        X_ACCESS_TOKEN: process.env.ARTSY_MCP_X_ACCESS_TOKEN!,
        X_USER_ID: process.env.ARTSY_MCP_X_USER_ID!,
      },
      prompt: getPrompt("artsy-mcp.md"),
    },
    github: {
      command: "npx",
      args: [
        "mcp-remote@0.1.29",
        "https://api.githubcopilot.com/mcp/readonly",
        "--header",
        `Authorization: Bearer ${process.env.GITHUB_ACCESS_TOKEN}`,
      ],
      env: {
        GITHUB_ACCESS_TOKEN: process.env.GITHUB_ACCESS_TOKEN!,
      },
      prompt: getPrompt("github.md"),
    },
  },
}

export default config
