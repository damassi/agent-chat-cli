import React from "react"
import { render } from "ink-testing-library"
import { test, expect, describe, mock } from "bun:test"
import { App } from "../App"
import { AgentStore } from "../store"

mock.module("../hooks/useConfig", () => ({
  useConfig: mock(() => {}),
}))

describe("App", () => {
  test("should render null when not booted", () => {
    const { lastFrame } = render(
      <AgentStore.Provider>
        <App />
      </AgentStore.Provider>
    )

    expect(lastFrame()).toBe("")
  })
})
