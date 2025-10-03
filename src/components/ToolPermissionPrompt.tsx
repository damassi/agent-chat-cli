import { Box, Text, useInput } from "ink"
import TextInput from "ink-text-input"
import { AgentStore } from "store"
import { formatToolInput } from "utils/formatToolInput"
import { getToolInfo } from "utils/getToolInfo"

export const ToolPermissionPrompt: React.FC = () => {
  const store = AgentStore.useStoreState((state) => state)
  const actions = AgentStore.useStoreActions((actions) => actions)

  if (!store.pendingToolPermission) return null

  const { toolName, input } = store.pendingToolPermission
  const { serverName, toolName: shortToolName } = getToolInfo(toolName)

  const handleSubmit = (value: string) => {
    if (store.messageQueue.length > 0) {
      const item = store.messageQueue.shift()
      if (item) {
        item.resolve(value)
      }
    }

    actions.setPendingToolPermission(undefined)
    actions.setInput("")
  }

  useInput((input, key) => {
    if (key.return) {
      // Enter = yes/allow
      handleSubmit("y")
    } else if (key.escape) {
      // ESC = no/deny
      handleSubmit("n")
    }
  })

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color="yellow">
        [Tool Permission Request]
      </Text>

      <Box marginLeft={2} flexDirection="column">
        <Box>
          <Text bold>Tool: </Text>
          {serverName ? (
            <>
              <Text color="cyan">[{serverName}]</Text>
              <Text> {shortToolName}</Text>
            </>
          ) : (
            <Text>{toolName}</Text>
          )}
        </Box>

        <Box flexDirection="column" marginTop={1}>
          <Text bold>Input:</Text>
          <Box marginLeft={2} flexDirection="column">
            {formatToolInput(input)
              .split("\n")
              .map((line, idx) => (
                <Text key={idx} dimColor>
                  {line}
                </Text>
              ))}
          </Box>
        </Box>

        <Box marginTop={1}>
          <Text dimColor>
            Allow? (Enter=yes, ESC=no, or type modified input):{" "}
          </Text>
        </Box>

        <Box>
          <TextInput
            value={store.input}
            onChange={actions.setInput}
            onSubmit={handleSubmit}
          />
        </Box>
      </Box>
    </Box>
  )
}
