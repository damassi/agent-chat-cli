import { Box, Text } from "ink"
import { AgentStore } from "store"
import type { ToolUse } from "store"
import { formatToolInput } from "utils/formatToolInput"
import { getToolInfo, isToolDisallowed } from "utils/getToolInfo"

interface ToolUsesProps {
  entry: ToolUse
}

export const ToolUses: React.FC<ToolUsesProps> = ({ entry }) => {
  const config = AgentStore.useStoreState((state) => state.config)
  const { serverName, toolName } = getToolInfo(entry.name)
  const isDenied = isToolDisallowed({ toolName: entry.name, config })

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        {serverName ? (
          <>
            <Text bold color="yellow">
              [{serverName}]
            </Text>
            <Text color="yellow">: {toolName}</Text>
          </>
        ) : (
          <Text color="yellow">[tool] {entry.name}</Text>
        )}
      </Box>

      {isDenied && (
        <Box marginLeft={2}>
          <Text color="red">✖ Tool denied by configuration</Text>
        </Box>
      )}

      <Box marginLeft={2} flexDirection="column">
        {formatToolInput(entry.input)
          .split("\n")
          .map((line, lineIdx) => {
            return (
              <Text key={lineIdx} dimColor>
                {line}
              </Text>
            )
          })}
      </Box>
    </Box>
  )
}
