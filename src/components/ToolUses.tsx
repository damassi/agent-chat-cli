import { Box, Text } from "ink"
import { AgentStore } from "../store"
import { formatToolInput } from "../utils/formatToolInput"

const renderToolInput = (obj: Record<string, unknown>) => {
  // Format the input (detects GraphQL queries and formats appropriately)
  const formattedString = formatToolInput(obj)

  // Split on actual newline characters and render each line
  return (
    <>
      {formattedString.split('\n').map((line, idx) => (
        <Text key={idx} dimColor>{line}</Text>
      ))}
    </>
  )
}

export const ToolUses: React.FC = () => {
  const currentToolUses = AgentStore.useStoreState((state) => state.currentToolUses)

  if (currentToolUses.length === 0) {
    return null
  }

  return (
    <Box flexDirection="column" marginBottom={1}>
      {currentToolUses.map((tool, idx) => {
        const parts = tool.name.split("__")

        if (parts.length >= 3 && parts[0] === "mcp") {
          const serverName = parts[1]
          const actualToolName = parts.slice(2).join("__")

          return (
            <Box key={idx} flexDirection="column" marginBottom={1}>
              <Box>
                <Text color="yellow">[server] </Text>
                <Text bold color="yellow">
                  {serverName}
                </Text>
                <Text color="yellow">: {actualToolName}</Text>
              </Box>
              <Box marginLeft={2} flexDirection="column">
                {renderToolInput(tool.input)}
              </Box>
            </Box>
          )
        }

        return (
          <Box key={idx} flexDirection="column" marginBottom={1}>
            <Text color="yellow">[tool] {tool.name}</Text>
            <Box marginLeft={2} flexDirection="column">
              {renderToolInput(tool.input)}
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}
