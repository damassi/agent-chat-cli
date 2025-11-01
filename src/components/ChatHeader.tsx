import { Box, Text } from "ink"
import { AgentStore } from "store"

export const ChatHeader: React.FC = () => {
  const store = AgentStore.useStoreState((state) => state)
  const availableServers = AgentStore.useStoreState(
    (state) => state.availableMcpServers
  )
  const availableAgents = AgentStore.useStoreState(
    (state) => state.availableAgents
  )

  return (
    <Box flexDirection="column" marginBottom={1} paddingTop={1}>
      <Text bold color="cyan">
        @ Agent CLI
      </Text>

      {store.mcpServers.length > 0 ? (
        <Box flexDirection="row" gap={1}>
          <Text dimColor>MCP Servers:</Text>

          {store.mcpServers.map((server) => (
            <Text
              key={server.name}
              color={server.status === "connected" ? "green" : "red"}
            >
              {server.name}
            </Text>
          ))}
        </Box>
      ) : (
        <>
          <Box>
            <Text dimColor>Available MCP Servers: </Text>
            <Text color="white">{availableServers.join(", ")}</Text>
          </Box>
        </>
      )}

      {availableAgents.length > 0 && (
        <Box>
          <Text dimColor>Agents: </Text>
          <Text color="white">{availableAgents.join(", ")}</Text>
        </Box>
      )}

      <Box marginTop={1} />

      <Text dimColor>
        Type your message and press Enter. Type 'exit' to quit.
      </Text>
    </Box>
  )
}
