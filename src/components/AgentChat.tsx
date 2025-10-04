import { Box, Text, useInput } from "ink"
import Spinner from "ink-spinner"
import { ChatHeader } from "components/ChatHeader"
import { Markdown } from "components/Markdown"
import { Stats } from "components/Stats"
import { ToolPermissionPrompt } from "components/ToolPermissionPrompt"
import { UserInput } from "components/UserInput"
import { useAgent } from "hooks/useAgent"
import { useMcpClient } from "hooks/useMcpClient"
import { AgentStore } from "store"
import { formatToolInput } from "utils/formatToolInput"
import { getToolInfo } from "utils/getToolInfo"

export const AgentChat: React.FC = () => {
  const actions = AgentStore.useStoreActions((actions) => actions)
  const state = useChatState()

  const isClient = process.argv.includes("--client")

  if (isClient) {
    useMcpClient()
  } else {
    useAgent()
  }

  useInput((_input, key) => {
    if (key.escape && state.isProcessing) {
      actions.setIsProcessing(false)
    }
  })

  return (
    <Box flexDirection="column" paddingLeft={1}>
      <ChatHeader />

      <Box flexDirection="column">
        {state.chatHistory.map((entry, idx) => {
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

        {state.currentAssistantMessage && (
          <Box flexDirection="column" marginBottom={1}>
            <Text bold color="blue">
              Agent:
            </Text>

            <Markdown>{state.currentAssistantMessage}</Markdown>
          </Box>
        )}

        <Stats />
      </Box>

      {(() => {
        switch (true) {
          case !!state.pendingToolPermission: {
            return <ToolPermissionPrompt />
          }

          case state.isProcessing: {
            return (
              <Text dimColor>
                <Text color="cyan">
                  <Spinner type="balloon" />
                </Text>
                {" Agent is thinking..."}
              </Text>
            )
          }

          default: {
            return <UserInput />
          }
        }
      })()}

      <Box marginTop={1} />
    </Box>
  )
}

const useChatState = () => {
  const chatHistory = AgentStore.useStoreState((state) => state.chatHistory)
  const currentAssistantMessage = AgentStore.useStoreState(
    (state) => state.currentAssistantMessage
  )
  const pendingToolPermission = AgentStore.useStoreState(
    (state) => state.pendingToolPermission
  )
  const isProcessing = AgentStore.useStoreState((state) => state.isProcessing)

  return {
    chatHistory,
    currentAssistantMessage,
    pendingToolPermission,
    isProcessing,
  }
}
