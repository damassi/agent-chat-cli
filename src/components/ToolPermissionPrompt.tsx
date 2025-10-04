import { BlinkCaret } from "components/BlinkCaret"
import { Box, Text, useInput } from "ink"
import TextInput from "ink-text-input"
import { AgentStore } from "store"
import { getToolInfo } from "utils/getToolInfo"

export const ToolPermissionPrompt: React.FC = () => {
  const store = AgentStore.useStoreState((state) => state)
  const actions = AgentStore.useStoreActions((actions) => actions)

  if (!store.pendingToolPermission) {
    return null
  }

  const { serverName, toolName } = getToolInfo(
    store.pendingToolPermission.toolName
  )

  const handleSubmit = (value: string) => {
    const response = value.trim() || "y"

    // Resolve ALL pending tool permission requests with the same response
    // This handles the case where multiple tools are called in parallel
    while (
      store.messageQueue.hasPendingRequests() &&
      store.pendingToolPermission
    ) {
      store.messageQueue.sendMessage(response)

      // Check if there are still more requests after sending
      if (!store.messageQueue.hasPendingRequests()) {
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
              <Text> {toolName}</Text>
            </>
          ) : (
            <Text>{toolName}</Text>
          )}
        </Box>

        <Box marginTop={1}>
          <Text dimColor>
            Allow? (Enter=yes, ESC=no, or ask another question):{" "}
          </Text>
        </Box>

        <Box>
          <BlinkCaret interval={100} color="green" enabled />

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
