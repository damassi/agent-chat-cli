import { Box, Text, useInput } from "ink"
import TextInput from "ink-text-input"
import { AgentStore } from "store"
import { getToolInfo } from "utils/getToolInfo"

export const ToolPermissionPrompt: React.FC = () => {
  const store = AgentStore.useStoreState((state) => state)
  const actions = AgentStore.useStoreActions((actions) => actions)

  if (!store.pendingToolPermission) return null

  const { toolName } = store.pendingToolPermission
  const { serverName, toolName: shortToolName } = getToolInfo(toolName)

  const handleSubmit = (value: string) => {
    // Default to "y" if Enter pressed with no input
    const response = value.trim() || "y"

    // Resolve ALL pending tool permission requests with the same response
    // This handles the case where multiple tools are called in parallel
    while (store.messageQueue.length > 0 && store.pendingToolPermission) {
      const item = store.messageQueue[0]
      if (item) {
        item.resolve(response)
        store.messageQueue.shift()
      } else {
        break
      }
    }

    actions.setPendingToolPermission(undefined)
    actions.setInput("")
  }

  useInput((_input, key) => {
    if (key.escape) {
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
