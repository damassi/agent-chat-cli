import React from "react"
import { render } from "ink-testing-library"
import { test, expect, describe } from "bun:test"
import { Stats } from "../Stats"
import { AgentStore } from "../../store"

describe("Stats", () => {
  test("should display stats string", () => {
    const { lastFrame, rerender } = render(
      <AgentStore.Provider>
        <TestWrapper statsValue="Cost: $0.01 | Duration: 2.5s | Turns: 3" />
      </AgentStore.Provider>
    )

    rerender(
      <AgentStore.Provider>
        <TestWrapper statsValue="Cost: $0.01 | Duration: 2.5s | Turns: 3" />
      </AgentStore.Provider>
    )

    expect(lastFrame()).toContain("Cost: $0.01")
    expect(lastFrame()).toContain("Duration: 2.5s")
    expect(lastFrame()).toContain("Turns: 3")
  })

  test("should not render when stats are null", () => {
    const { lastFrame } = render(
      <AgentStore.Provider>
        <Stats />
      </AgentStore.Provider>
    )

    expect(lastFrame()).toBe("")
  })

  test("should not render when stats are undefined", () => {
    const { lastFrame } = render(
      <AgentStore.Provider>
        <Stats />
      </AgentStore.Provider>
    )

    expect(lastFrame()).toBe("")
  })
})

const TestWrapper = ({ statsValue }: { statsValue: string }) => {
  const actions = AgentStore.useStoreActions((actions) => actions)
  actions.setStats(statsValue)
  return <Stats />
}
