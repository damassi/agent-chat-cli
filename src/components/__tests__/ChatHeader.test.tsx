import React from "react"
import { render } from "ink-testing-library"
import { test, expect, describe } from "bun:test"
import { ChatHeader } from "components/ChatHeader"
import { AgentStore } from "store"

describe("ChatHeader", () => {
  test("should render title", () => {
    const { lastFrame } = render(
      <AgentStore.Provider>
        <ChatHeader />
      </AgentStore.Provider>
    )

    expect(lastFrame()).toContain("@ Agent CLI")
  })

  test("should render instructions", () => {
    const { lastFrame } = render(
      <AgentStore.Provider>
        <ChatHeader />
      </AgentStore.Provider>
    )

    expect(lastFrame()).toContain("Type your message and press Enter")
    expect(lastFrame()).toContain("Type 'exit' to quit")
  })

  test("should show connecting message when no servers", () => {
    const { lastFrame } = render(
      <AgentStore.Provider>
        <ChatHeader />
      </AgentStore.Provider>
    )

    expect(lastFrame()).toContain("Connecting to MCP servers...")
  })

  test("should display connected servers", () => {
    const { lastFrame, rerender } = render(
      <AgentStore.Provider>
        <TestWrapper
          servers={[
            { name: "github", status: "connected" },
            { name: "gitlab", status: "connected" },
          ]}
        />
      </AgentStore.Provider>
    )

    rerender(
      <AgentStore.Provider>
        <TestWrapper
          servers={[
            { name: "github", status: "connected" },
            { name: "gitlab", status: "connected" },
          ]}
        />
      </AgentStore.Provider>
    )

    expect(lastFrame()).toContain("MCP Servers:")
    expect(lastFrame()).toContain("github")
    expect(lastFrame()).toContain("gitlab")
  })

  test("should show server status with colors", () => {
    const { lastFrame, rerender } = render(
      <AgentStore.Provider>
        <TestWrapper
          servers={[
            { name: "github", status: "connected" },
            { name: "gitlab", status: "error" },
          ]}
        />
      </AgentStore.Provider>
    )

    rerender(
      <AgentStore.Provider>
        <TestWrapper
          servers={[
            { name: "github", status: "connected" },
            { name: "gitlab", status: "error" },
          ]}
        />
      </AgentStore.Provider>
    )

    expect(lastFrame()).toContain("github")
    expect(lastFrame()).toContain("gitlab")
  })
})

const TestWrapper = ({
  servers,
}: {
  servers: Array<{ name: string; status: string }>
}) => {
  const actions = AgentStore.useStoreActions((actions) => actions)
  actions.setMcpServers(servers)
  return <ChatHeader />
}
