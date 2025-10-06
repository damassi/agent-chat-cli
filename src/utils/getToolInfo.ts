import type { AgentChatConfig } from "store"

export const getToolInfo = (tool: string) => {
  const parts = tool.split("__")
  const serverName = parts.length >= 3 && parts[0] === "mcp" ? parts[1] : null
  const toolName = serverName ? parts.slice(2).join("__") : tool

  return {
    serverName,
    toolName,
  }
}

/**
 * Get disallowedTools list from MCP server denyTools config.
 * Converts tool names like "search_repositories" to "mcp__github__search_repositories"
 */
export const getDisallowedTools = (config: AgentChatConfig): string[] => {
  const disallowed = Object.entries(config.mcpServers).flatMap(
    ([serverName, serverConfig]) => {
      if (!serverConfig.denyTools) {
        return []
      }

      return serverConfig.denyTools.map(
        (toolName) => `mcp__${serverName}__${toolName}`
      )
    }
  )

  return disallowed
}

export interface IsToolDisallowedProps {
  toolName: string
  config: AgentChatConfig
}

export const isToolDisallowed = ({
  toolName,
  config,
}: IsToolDisallowedProps): boolean => {
  const disallowed = getDisallowedTools(config)
  const isDisallowed = disallowed.includes(toolName)
  return isDisallowed
}
