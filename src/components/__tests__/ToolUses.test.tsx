import React from "react"
import { render } from "ink-testing-library"
import { test, expect, describe } from "bun:test"
import { ToolUses } from "../ToolUses"
import { AgentStore } from "../../store"
import type { ToolUse } from "../../store"

describe("ToolUses", () => {
  test("should display MCP tool with server name", () => {
    const toolUse: ToolUse = {
      type: "tool_use",
      name: "mcp__github__search_repositories",
      input: { query: "test" },
    }

    const { lastFrame, rerender } = render(
      <AgentStore.Provider>
        <TestWrapper toolUse={toolUse} config={{ mcpServers: {} }} />
      </AgentStore.Provider>
    )

    rerender(
      <AgentStore.Provider>
        <TestWrapper toolUse={toolUse} config={{ mcpServers: {} }} />
      </AgentStore.Provider>
    )

    expect(lastFrame()).toContain("[github]")
    expect(lastFrame()).toContain("search_repositories")
  })

  test("should display regular tool without server name", () => {
    const toolUse: ToolUse = {
      type: "tool_use",
      name: "regular_tool",
      input: { param: "value" },
    }

    const { lastFrame, rerender } = render(
      <AgentStore.Provider>
        <TestWrapper toolUse={toolUse} config={{ mcpServers: {} }} />
      </AgentStore.Provider>
    )

    rerender(
      <AgentStore.Provider>
        <TestWrapper toolUse={toolUse} config={{ mcpServers: {} }} />
      </AgentStore.Provider>
    )

    expect(lastFrame()).toContain("[tool] regular_tool")
  })

  test("should display formatted tool input", () => {
    const toolUse: ToolUse = {
      type: "tool_use",
      name: "test_tool",
      input: { param1: "value1", param2: "value2" },
    }

    const { lastFrame, rerender } = render(
      <AgentStore.Provider>
        <TestWrapper toolUse={toolUse} config={{ mcpServers: {} }} />
      </AgentStore.Provider>
    )

    rerender(
      <AgentStore.Provider>
        <TestWrapper toolUse={toolUse} config={{ mcpServers: {} }} />
      </AgentStore.Provider>
    )

    expect(lastFrame()).toContain("param1")
    expect(lastFrame()).toContain("value1")
    expect(lastFrame()).toContain("param2")
    expect(lastFrame()).toContain("value2")
  })

  test("should show denied tool indicator", () => {
    const toolUse: ToolUse = {
      type: "tool_use",
      name: "mcp__github__search",
      input: {},
    }

    const { lastFrame, rerender } = render(
      <AgentStore.Provider>
        <TestWrapper
          toolUse={toolUse}
          config={{
            mcpServers: {
              github: {
                command: "node",
                args: [],
                denyTools: ["search"],
              },
            },
          }}
        />
      </AgentStore.Provider>
    )

    rerender(
      <AgentStore.Provider>
        <TestWrapper
          toolUse={toolUse}
          config={{
            mcpServers: {
              github: {
                command: "node",
                args: [],
                denyTools: ["search"],
              },
            },
          }}
        />
      </AgentStore.Provider>
    )

    expect(lastFrame()).toContain("✖ Tool denied by configuration")
  })

  test("should not show denied indicator for allowed tools", () => {
    const toolUse: ToolUse = {
      type: "tool_use",
      name: "mcp__github__create_issue",
      input: {},
    }

    const { lastFrame, rerender } = render(
      <AgentStore.Provider>
        <TestWrapper
          toolUse={toolUse}
          config={{
            mcpServers: {
              github: {
                command: "node",
                args: [],
                denyTools: ["search"],
              },
            },
          }}
        />
      </AgentStore.Provider>
    )

    rerender(
      <AgentStore.Provider>
        <TestWrapper
          toolUse={toolUse}
          config={{
            mcpServers: {
              github: {
                command: "node",
                args: [],
                denyTools: ["search"],
              },
            },
          }}
        />
      </AgentStore.Provider>
    )

    expect(lastFrame()).not.toContain("✖ Tool denied by configuration")
  })

  test("should handle empty input", () => {
    const toolUse: ToolUse = {
      type: "tool_use",
      name: "test_tool",
      input: {},
    }

    const { lastFrame, rerender } = render(
      <AgentStore.Provider>
        <TestWrapper toolUse={toolUse} config={{ mcpServers: {} }} />
      </AgentStore.Provider>
    )

    rerender(
      <AgentStore.Provider>
        <TestWrapper toolUse={toolUse} config={{ mcpServers: {} }} />
      </AgentStore.Provider>
    )

    expect(lastFrame()).toContain("test_tool")
  })

  test("should handle multiline input", () => {
    const toolUse: ToolUse = {
      type: "tool_use",
      name: "test_tool",
      input: { query: "line1\nline2\nline3" },
    }

    const { lastFrame, rerender } = render(
      <AgentStore.Provider>
        <TestWrapper toolUse={toolUse} config={{ mcpServers: {} }} />
      </AgentStore.Provider>
    )

    rerender(
      <AgentStore.Provider>
        <TestWrapper toolUse={toolUse} config={{ mcpServers: {} }} />
      </AgentStore.Provider>
    )

    expect(lastFrame()).toContain("line1")
    expect(lastFrame()).toContain("line2")
    expect(lastFrame()).toContain("line3")
  })
})

const TestWrapper = ({
  toolUse,
  config,
}: {
  toolUse: ToolUse
  config: any
}) => {
  const actions = AgentStore.useStoreActions((actions) => actions)
  actions.setConfig(config)
  return <ToolUses entry={toolUse} />
}
