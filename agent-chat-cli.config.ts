import type { AgentChatConfig } from "./src/store"
import { getPrompt } from "./src/utils/getPrompt"

const config: AgentChatConfig = {
  stream: false,
  permissionMode: "default",
  mcpServers: {
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
