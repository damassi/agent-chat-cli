import { Box } from "ink"
import TextInput from "ink-text-input"
import { BlinkCaret } from "components/BlinkCaret"
import { AgentStore } from "store"

export const UserInput: React.FC = () => {
  const store = AgentStore.useStoreState((state) => state)
  const actions = AgentStore.useStoreActions((actions) => actions)

  const handleSubmit = (value: string) => {
    if (value.toLowerCase() === "exit") {
      process.exit(0)
    }

    if (!value.trim()) return

    actions.addChatHistoryEntry({
      type: "message",
      role: "user",
      content: value,
    })
    actions.setIsProcessing(true)
    actions.setStats(null)

    store.messageQueue.sendMessage(value)

    actions.setInput("")
  }

  return (
    <Box>
      <BlinkCaret enabled={store.mcpServers.length > 0} />

      <TextInput
        value={store.input}
        onChange={actions.setInput}
        onSubmit={handleSubmit}
      />
    </Box>
  )
}
