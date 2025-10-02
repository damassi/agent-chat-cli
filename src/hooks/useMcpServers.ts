import { AgentStore } from "store"

const CONNECTION_TIMEOUT = 10000
const MAX_RETRIES = 3
const RETRY_DELAY = 2000

export const useMcpServers = () => {
  const config = AgentStore.useStoreState((state) => state.config)
  const actions = AgentStore.useStoreActions((actions) => actions)

  const initMcpServers = async (
    response: any,
    retryCount = 0
  ): Promise<void> => {
    const connectionTimeout = config.connectionTimeout ?? CONNECTION_TIMEOUT
    const maxRetries = config.maxRetries ?? MAX_RETRIES
    const retryDelay = config.retryDelay ?? RETRY_DELAY
    const mcpServers = config.mcpServers

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("MCP server connection timeout")),
          connectionTimeout
        )
      )

      const servers = await Promise.race([
        response.mcpServerStatus(),
        timeoutPromise,
      ])

      actions.setMcpServers(servers)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)

      if (retryCount < maxRetries) {
        const newRetryCount = retryCount + 1

        actions.addChatHistoryEntry({
          type: "message",
          role: "system",
          content: `Failed to get MCP server status: ${errorMessage}. Retrying connection (${newRetryCount}/${maxRetries})...`,
        })

        await new Promise((resolve) => setTimeout(resolve, retryDelay))

        // Retry
        await initMcpServers(response, newRetryCount)
      } else {
        actions.addChatHistoryEntry({
          type: "message",
          role: "system",
          content: `Failed to connect to MCP servers after ${maxRetries} attempts: ${errorMessage}. Servers marked as disconnected.`,
        })

        const disconnectedServers = Object.keys(mcpServers).map((name) => ({
          name,
          status: "disconnected",
        }))

        actions.setMcpServers(disconnectedServers)
      }
    }
  }

  return {
    initMcpServers,
  }
}
