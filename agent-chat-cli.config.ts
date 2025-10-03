import type { AgentChatConfig } from "./src/store"
import { getPrompt } from "./src/utils/getPrompt"

const config: AgentChatConfig = {
  stream: false,
  mcpServers: {
    artsymcp: {
      prompt: getPrompt("artsy-mcp.md"),
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
    },
    github: {
      prompt: getPrompt("github.md"),
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
    },
    notion: {
      prompt: getPrompt("notion.md"),
      command: "npx",
      args: ["mcp-remote@0.1.29", "https://mcp.notion.com/mcp"],
    },
  },
}

export default config
