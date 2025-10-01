import { Box, Text } from "ink"
import Spinner from "ink-spinner"
import TextInput from "ink-text-input"
import { ChatHeader } from "./components/ChatHeader"
import { Markdown } from "./components/Markdown"
import { Stats } from "./components/Stats"
import { useAgent } from "./hooks/useAgent"
import { AgentStore } from "./store"
import { formatToolInput } from "./utils/formatToolInput"

export const AgentChat: React.FC = () => {
  const store = AgentStore.useStoreState((state) => state)
  const actions = AgentStore.useStoreActions((actions) => actions)

  useAgent()

  const handleSubmit = (value: string) => {
    if (value.toLowerCase() === "exit") {
      actions.setShouldExit(true)
      process.exit(0)
    }

    if (!value.trim()) return

    actions.addChatHistoryEntry({ type: "message", role: "user", content: value })
    actions.setIsProcessing(true)
    actions.setStats(undefined)

    if (store.messageQueue.length > 0) {
      const item = store.messageQueue.shift()
      if (item) {
        item.resolve(value)
      }
    }

    actions.setInput("")
  }

  if (store.shouldExit) {
    return (
      <Box flexDirection="column">
        <Text>👋 Goodbye!</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      <ChatHeader />

      <Box flexDirection="column">

        {store.chatHistory.map((entry, idx) => {
          return (
            <>
              {(() => {
                switch (true) {
                  case entry.type === "message": {
                    return (
                      <Box key={idx} flexDirection="column" marginBottom={1}>
                        <Text bold color={entry.role === "user" ? "green" : "blue"}>
                          {entry.role === "user" ? "You" : "Artsy Agent"}:
                        </Text>

                        {entry.role === "user" ? (
                          <Text>{entry.content}</Text>
                        ) : (
                          <Markdown>{entry.content}</Markdown>
                        )}
                      </Box>
                    )
                  }
                  case entry.type === "tool_use": {
                    const parts = entry.name.split("__")
                    const serverName = parts.length >= 3 && parts[0] === "mcp" ? parts[1] : null
                    const actualToolName = serverName ? parts.slice(2).join("__") : entry.name

                    return (
                      <Box key={idx} flexDirection="column" marginBottom={1}>
                        <Box>
                          {serverName ? (
                            <>
                              <Text color="yellow">[server] </Text>
                              <Text bold color="yellow">{serverName}</Text>
                              <Text color="yellow">: {actualToolName}</Text>
                            </>
                          ) : (
                            <Text color="yellow">[tool] {entry.name}</Text>
                          )}
                        </Box>
                        <Box marginLeft={2} flexDirection="column">
                          {formatToolInput(entry.input)
                            .split('\n')
                            .map((line, lineIdx) => (
                              <Text key={lineIdx} dimColor>{line}</Text>
                            ))}
                        </Box>
                      </Box>
                    )
                  }

                }
              })()}
            </>
          )
        })}


        {store.currentAssistantMessage && (
          <Box flexDirection="column" marginBottom={1}>
            <Text bold color="blue">
              Agent:
            </Text>

            <Markdown>{store.currentAssistantMessage}</Markdown>
          </Box>
        )}

        <Stats />
      </Box>

      {!store.isProcessing && (
        <Box>
          <Text bold color="green">
            You:{" "}
          </Text>

          <TextInput
            value={store.input}
            onChange={actions.setInput}
            onSubmit={handleSubmit}
          />
        </Box>
      )}

      {store.isProcessing && (
        <Text dimColor>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          {" Agent is thinking..."}
        </Text>
      )}
    </Box>
  )
}
