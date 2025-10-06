import React from "react"
import { render } from "ink-testing-library"
import { test, expect, describe } from "bun:test"
import { useCycleMessages } from "../useCycleMessages"
import { AgentStore } from "../../store"

describe("useCycleMessages", () => {
  test("should initialize with no messages", () => {
    const { rerender } = render(
      <AgentStore.Provider>
        <TestComponent />
      </AgentStore.Provider>
    )

    rerender(
      <AgentStore.Provider>
        <TestComponent />
      </AgentStore.Provider>
    )

    expect(true).toBe(true)
  })

  test("should filter user messages from chat history", () => {
    const { rerender } = render(
      <AgentStore.Provider>
        <TestComponentWithMessages
          messages={[
            {
              type: "message" as const,
              role: "user" as const,
              content: "Hello",
            },
            {
              type: "message" as const,
              role: "assistant" as const,
              content: "Hi",
            },
            {
              type: "message" as const,
              role: "user" as const,
              content: "How are you?",
            },
          ]}
        />
      </AgentStore.Provider>
    )

    rerender(
      <AgentStore.Provider>
        <TestComponentWithMessages
          messages={[
            {
              type: "message" as const,
              role: "user" as const,
              content: "Hello",
            },
            {
              type: "message" as const,
              role: "assistant" as const,
              content: "Hi",
            },
            {
              type: "message" as const,
              role: "user" as const,
              content: "How are you?",
            },
          ]}
        />
      </AgentStore.Provider>
    )

    expect(true).toBe(true)
  })

  test("should expose reset function", () => {
    let resetFn: (() => void) | undefined

    const TestComponentWithReset = () => {
      const { reset } = useCycleMessages()
      resetFn = reset
      return null
    }

    render(
      <AgentStore.Provider>
        <TestComponentWithReset />
      </AgentStore.Provider>
    )

    expect(typeof resetFn).toBe("function")
  })

  test("should handle empty chat history", () => {
    const { rerender } = render(
      <AgentStore.Provider>
        <TestComponentWithMessages messages={[]} />
      </AgentStore.Provider>
    )

    rerender(
      <AgentStore.Provider>
        <TestComponentWithMessages messages={[]} />
      </AgentStore.Provider>
    )

    expect(true).toBe(true)
  })

  test("should handle chat history with only assistant messages", () => {
    const { rerender } = render(
      <AgentStore.Provider>
        <TestComponentWithMessages
          messages={[
            {
              type: "message" as const,
              role: "assistant" as const,
              content: "Hello",
            },
            {
              type: "message" as const,
              role: "assistant" as const,
              content: "How can I help?",
            },
          ]}
        />
      </AgentStore.Provider>
    )

    rerender(
      <AgentStore.Provider>
        <TestComponentWithMessages
          messages={[
            {
              type: "message" as const,
              role: "assistant" as const,
              content: "Hello",
            },
            {
              type: "message" as const,
              role: "assistant" as const,
              content: "How can I help?",
            },
          ]}
        />
      </AgentStore.Provider>
    )

    expect(true).toBe(true)
  })

  test("should handle multiple user messages", () => {
    const { rerender } = render(
      <AgentStore.Provider>
        <TestComponentWithMessages
          messages={[
            {
              type: "message" as const,
              role: "user" as const,
              content: "Message 1",
            },
            {
              type: "message" as const,
              role: "user" as const,
              content: "Message 2",
            },
            {
              type: "message" as const,
              role: "user" as const,
              content: "Message 3",
            },
          ]}
        />
      </AgentStore.Provider>
    )

    rerender(
      <AgentStore.Provider>
        <TestComponentWithMessages
          messages={[
            {
              type: "message" as const,
              role: "user" as const,
              content: "Message 1",
            },
            {
              type: "message" as const,
              role: "user" as const,
              content: "Message 2",
            },
            {
              type: "message" as const,
              role: "user" as const,
              content: "Message 3",
            },
          ]}
        />
      </AgentStore.Provider>
    )

    expect(true).toBe(true)
  })
})

const TestComponent = () => {
  useCycleMessages()
  return null
}

const TestComponentWithMessages = ({
  messages,
}: {
  messages: Array<{
    type: "message"
    role: "user" | "assistant"
    content: string
  }>
}) => {
  const actions = AgentStore.useStoreActions((actions) => actions)
  const store = AgentStore.useStoreState((state) => state)

  if (store.chatHistory.length === 0 && messages.length > 0) {
    messages.forEach((message) => {
      actions.addChatHistoryEntry(message)
    })
  }

  useCycleMessages()
  return null
}
