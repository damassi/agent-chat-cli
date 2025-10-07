import React from "react"
import { render } from "ink-testing-library"
import { test, expect, describe } from "bun:test"
import { UserInput } from "components/UserInput"
import { AgentStore } from "store"

describe("UserInput", () => {
  test("should render input field", () => {
    const { lastFrame } = render(
      <AgentStore.Provider>
        <UserInput />
      </AgentStore.Provider>
    )

    expect(lastFrame()).toContain("▷")
  })

  test("should show blink caret when servers are connected", () => {
    const { lastFrame, rerender } = render(
      <AgentStore.Provider>
        <TestWrapper servers={[{ name: "github", status: "connected" }]} />
      </AgentStore.Provider>
    )

    rerender(
      <AgentStore.Provider>
        <TestWrapper servers={[{ name: "github", status: "connected" }]} />
      </AgentStore.Provider>
    )

    expect(lastFrame()).toContain("▷")
  })

  test("should not show blink caret when no servers", () => {
    const { lastFrame } = render(
      <AgentStore.Provider>
        <UserInput />
      </AgentStore.Provider>
    )

    expect(lastFrame()).toContain("▷")
  })
})

const TestWrapper = ({
  servers,
}: {
  servers: Array<{ name: string; status: string }>
}) => {
  const actions = AgentStore.useStoreActions((actions) => actions)
  actions.setMcpServers(servers)
  return <UserInput />
}
