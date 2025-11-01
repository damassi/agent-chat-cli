import type { AgentChatConfig } from "store"

export const getEnabledMcpServers = (
  mcpServers: AgentChatConfig["mcpServers"] | undefined
) => {
  if (!mcpServers) {
    return undefined
  }

  return Object.fromEntries(
    Object.entries(mcpServers).filter(([_, server]) => server.enabled !== false)
  )
}
