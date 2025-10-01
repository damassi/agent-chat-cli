import { cosmiconfig } from "cosmiconfig"
import { TypeScriptLoader } from "cosmiconfig-typescript-loader"
import type { McpServerConfig } from "@anthropic-ai/claude-agent-sdk"

type McpServerConfigWithPrompt = McpServerConfig & {
  prompt?: string
}

interface AgentChatConfig {
  mcpServers: Record<string, McpServerConfigWithPrompt>
}

export const loadConfig = async (): Promise<AgentChatConfig> => {
  const explorer = cosmiconfig("agent-chat-cli", {
    searchPlaces: [
      "agent-chat-cli.config.ts",
      "agent-chat-cli.config.js",
      ".agent-chat-clirc",
      ".agent-chat-clirc.json",
      ".agent-chat-clirc.js",
      ".agent-chat-clirc.ts",
    ],
    loaders: {
      ".ts": TypeScriptLoader(),
    },
  })

  const result = await explorer.search()

  if (!result || result.isEmpty) {
    throw new Error("No configuration file found")
  }

  return result.config as AgentChatConfig
}
