import { Box, Text } from "ink"
import Spinner from "ink-spinner"
import { AgentStore } from "../store"

export const ChatHeader: React.FC = () => {
  const store = AgentStore.useStoreState((state) => state)

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box marginTop={1} />

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
        <Text dimColor>
          <Text color="green">
            <Spinner type="balloon" />
          </Text>
          {" Connecting to MCP servers..."}
        </Text>
      )}

      <Box marginTop={1} />

      <Text dimColor>
        Type your message and press Enter. Type 'exit' to quit.
      </Text>
    </Box>
  )
}
