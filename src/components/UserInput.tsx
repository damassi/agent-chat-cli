import { Box } from "ink"
import TextInput from "ink-text-input"
import { BlinkCaret } from "components/BlinkCaret"
import { useCycleMessages } from "hooks/useCycleMessages"
import { AgentStore } from "store"

const commands = {
  CLEAR: "clear",
  EXIT: "exit",
}

export const UserInput: React.FC = () => {
  const store = AgentStore.useStoreState((state) => state)
  const actions = AgentStore.useStoreActions((actions) => actions)
  const { reset } = useCycleMessages()

  const handleSubmit = (value: string) => {
    if (value.toLowerCase() === commands.EXIT) {
      process.exit(0)
    }

    if (value.toLowerCase() === commands.CLEAR) {
      actions.reset()
      return
    }

    if (!value.trim()) {
      return
    }

    actions.addChatHistoryEntry({
      type: "message",
      role: "user",
      content: value,
    })

    actions.sendMessage(value)
    reset()
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
