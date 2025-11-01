import { cosmiconfig } from "cosmiconfig"
import type { AgentChatConfig } from "store"

export const loadConfig = async (): Promise<AgentChatConfig> => {
  const result = await cosmiconfig("agent-chat-cli").search()

  if (!result || result.isEmpty) {
    throw new Error("[agent-cli] No configuration file found")
  }

  return result.config
}
