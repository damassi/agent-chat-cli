import { Box, Text } from "ink"
import Spinner from "ink-spinner"
import TextInput from "ink-text-input"
import { ChatHeader } from "./components/ChatHeader"
import { Markdown } from "./components/Markdown"
import { Stats } from "./components/Stats"
import { useAgent } from "./hooks/useAgent"
import { AgentStore } from "./store"
import { formatToolInput } from "./utils/formatToolInput"
import { getToolInfo } from "./utils/getToolInfo"

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

    actions.addChatHistoryEntry({
      type: "message",
      role: "user",
      content: value,
    })
    actions.setIsProcessing(true)
    actions.setStats(null)

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
            <Box key={idx}>
              {(() => {
                switch (true) {
                  case entry.type === "message": {
                    const isUser = entry.role === "user"
                    const isSystem = entry.role === "system"

                    return (
                      <Box flexDirection="column" marginBottom={1}>
                        <Text
                          bold
                          color={
                            isUser ? "green" : isSystem ? "yellow" : "blue"
                          }
                        >
                          {isUser ? "You" : isSystem ? "System" : "Agent"}:
                        </Text>

                        {isUser || isSystem ? (
                          <Text dimColor={isSystem}>{entry.content}</Text>
                        ) : (
                          <Markdown>{entry.content}</Markdown>
                        )}
                      </Box>
                    )
                  }

                  case entry.type === "tool_use": {
                    const { serverName, toolName } = getToolInfo(entry.name)

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

                        <Box marginLeft={2} flexDirection="column">
                          {formatToolInput(entry.input)
                            .split("\n")
                            .map((line, lineIdx) => (
                              <Text key={lineIdx} dimColor>
                                {line}
                              </Text>
                            ))}
                        </Box>
                      </Box>
                    )
                  }
                }
              })()}
            </Box>
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

      {store.isProcessing ? (
        <Text dimColor>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          {" Agent is thinking..."}
        </Text>
      ) : (
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

      <Box marginTop={1} />
    </Box>
  )
}
