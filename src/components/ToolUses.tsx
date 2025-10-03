import { Box, Text } from "ink"
import { AgentStore } from "store"
import { formatToolInput } from "utils/formatToolInput"

export const ToolUses: React.FC = () => {
  const currentToolUses = AgentStore.useStoreState(
    (state) => state.currentToolUses
  )

  if (currentToolUses.length === 0) {
    return null
  }

  return (
    <Box flexDirection="column" marginBottom={1}>
      {currentToolUses.map((tool, idx) => {
        const parts = tool.name.split("__")

        if (parts.length >= 3 && parts[0] === "mcp") {
          const serverName = parts[1]
          const toolName = parts.slice(2).join("__")

          return (
            <Box key={idx} flexDirection="column" marginBottom={1}>
              <Box>
                <Text color="yellow">[server] </Text>

                <Text bold color="yellow">
                  {serverName}
                </Text>

                <Text color="yellow">: {toolName}</Text>
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

const renderToolInput = (obj: Record<string, unknown>) => {
  const toolInput = formatToolInput(obj)

  return (
    <>
      {toolInput.split("\n").map((line, idx) => (
        <Text key={idx} dimColor>
          {line}
        </Text>
      ))}
    </>
  )
}
