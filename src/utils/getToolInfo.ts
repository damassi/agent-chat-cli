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
 * Get disallowedTools list from MCP server disallowedTools config.
 * Converts tool names like "search_repositories" to "mcp__github__search_repositories"
 */
export const getDisallowedTools = (config: AgentChatConfig): string[] => {
  const disallowedSystemTools = config.disallowedTools ?? ["Bash"]

  const disallowed = Object.entries(config.mcpServers)
    .flatMap(([serverName, serverConfig]) => {
      if (!serverConfig.disallowedTools) {
        return []
      }

      return serverConfig.disallowedTools.map(
        (toolName) => `mcp__${serverName}__${toolName}`
      )
    })
    .concat(disallowedSystemTools)

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
