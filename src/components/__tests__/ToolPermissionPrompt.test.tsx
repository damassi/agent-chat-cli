import React from "react"
import { render } from "ink-testing-library"
import { test, expect, describe } from "bun:test"
import { ToolPermissionPrompt } from "../ToolPermissionPrompt"
import { AgentStore } from "../../store"

describe("ToolPermissionPrompt", () => {
  test("should not render when no pending permission", () => {
    const { lastFrame } = render(
      <AgentStore.Provider>
        <ToolPermissionPrompt />
      </AgentStore.Provider>
    )

    expect(lastFrame()).toBe("")
  })

  test("should render permission request with MCP tool", () => {
    const { lastFrame, rerender } = render(
      <AgentStore.Provider>
        <TestWrapper
          permission={{
            toolName: "mcp__github__search_repositories",
            input: { query: "test" },
          }}
        />
      </AgentStore.Provider>
    )

    rerender(
      <AgentStore.Provider>
        <TestWrapper
          permission={{
            toolName: "mcp__github__search_repositories",
            input: { query: "test" },
          }}
        />
      </AgentStore.Provider>
    )

    expect(lastFrame()).toContain("[Tool Permission Request]")
    expect(lastFrame()).toContain("Tool:")
    expect(lastFrame()).toContain("[github]")
    expect(lastFrame()).toContain("search_repositories")
  })

  test("should render permission request with regular tool", () => {
    const { lastFrame, rerender } = render(
      <AgentStore.Provider>
        <TestWrapper
          permission={{
            toolName: "regular_tool",
            input: {},
          }}
        />
      </AgentStore.Provider>
    )

    rerender(
      <AgentStore.Provider>
        <TestWrapper
          permission={{
            toolName: "regular_tool",
            input: {},
          }}
        />
      </AgentStore.Provider>
    )

    expect(lastFrame()).toContain("[Tool Permission Request]")
    expect(lastFrame()).toContain("regular_tool")
  })

  test("should show prompt text", () => {
    const { lastFrame, rerender } = render(
      <AgentStore.Provider>
        <TestWrapper
          permission={{
            toolName: "test_tool",
            input: {},
          }}
        />
      </AgentStore.Provider>
    )

    rerender(
      <AgentStore.Provider>
        <TestWrapper
          permission={{
            toolName: "test_tool",
            input: {},
          }}
        />
      </AgentStore.Provider>
    )

    expect(lastFrame()).toContain("Allow?")
    expect(lastFrame()).toContain("Enter=yes")
    expect(lastFrame()).toContain("ESC=no")
  })

  test("should show blink caret", () => {
    const { lastFrame, rerender } = render(
      <AgentStore.Provider>
        <TestWrapper
          permission={{
            toolName: "test_tool",
            input: {},
          }}
        />
      </AgentStore.Provider>
    )

    rerender(
      <AgentStore.Provider>
        <TestWrapper
          permission={{
            toolName: "test_tool",
            input: {},
          }}
        />
      </AgentStore.Provider>
    )

    expect(lastFrame()).toContain("▷")
  })
})

const TestWrapper = ({
  permission,
}: {
  permission: { toolName: string; input: any }
}) => {
  const actions = AgentStore.useStoreActions((actions) => actions)
  actions.setPendingToolPermission(permission)
  return <ToolPermissionPrompt />
}
