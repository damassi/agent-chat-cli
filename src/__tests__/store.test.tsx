import React from "react"
import { render } from "ink-testing-library"
import { test, expect, describe } from "bun:test"
import { AgentStore } from "../store"
import type { Message, McpServerStatus, ToolUse } from "../store"
import { MessageQueue } from "../utils/MessageQueue"

describe("Store", () => {
  const setup = (initialState = {}) => {
    let state: any
    let actions: any

    const TestComponent = () => {
      state = AgentStore.useStoreState((state) => state)
      actions = AgentStore.useStoreActions((actions) => actions)
      return null
    }

    const { rerender } = render(
      <AgentStore.Provider {...initialState}>
        <TestComponent />
      </AgentStore.Provider>
    )

    return {
      getState: () => {
        rerender(
          <AgentStore.Provider {...initialState}>
            <TestComponent />
          </AgentStore.Provider>
        )
        return state
      },
      actions,
    }
  }

  describe("initialization", () => {
    test("should initialize with default state", () => {
      const { getState } = setup()

      expect(getState().chatHistory).toEqual([])
      expect(getState().currentAssistantMessage).toBe("")
      expect(getState().currentToolUses).toEqual([])
      expect(getState().input).toBe("")
      expect(getState().isProcessing).toBe(false)
      expect(getState().mcpServers).toEqual([])
      expect(getState().sessionId).toBeUndefined()
      expect(getState().stats).toBeUndefined()
      expect(getState().pendingToolPermission).toBeUndefined()
      expect(getState().abortController).toBeUndefined()
    })

    test("should have MessageQueue instance", () => {
      const { getState } = setup()

      expect(getState().messageQueue).toBeInstanceOf(MessageQueue)
    })

    test("should expose all expected actions", () => {
      const { actions } = setup()

      expect(Object.keys(actions)).toEqual(
        expect.arrayContaining([
          "abortRequest",
          "addChatHistoryEntry",
          "addToolUse",
          "appendCurrentAssistantMessage",
          "clearCurrentAssistantMessage",
          "clearToolUses",
          "reset",
          "sendMessage",
          "setPendingToolPermission",
          "setAbortController",
          "setConfig",
          "setcurrentAssistantMessage",
          "setCurrentToolUses",
          "setInput",
          "setIsProcessing",
          "setMcpServers",
          "setSessionId",
          "setStats",
        ])
      )
    })
  })

  describe("computed properties", () => {
    test("isBooted should be false when config is null", () => {
      const { getState } = setup()

      expect(getState().isBooted).toBe(false)
    })

    test("isBooted should be true when config is set", () => {
      const { getState, actions } = setup()

      actions.setConfig({
        mcpServers: {},
      })

      expect(getState().isBooted).toBe(true)
    })
  })

  describe("chat history actions", () => {
    test("addChatHistoryEntry should add message to chat history", () => {
      const { getState, actions } = setup()

      const message: Message = {
        type: "message",
        role: "user",
        content: "Hello",
      }

      actions.addChatHistoryEntry(message)

      expect(getState().chatHistory).toHaveLength(1)
      expect(getState().chatHistory[0]).toEqual(message)
    })

    test("addChatHistoryEntry should append to existing history", () => {
      const { getState, actions } = setup()

      const message1: Message = {
        type: "message",
        role: "user",
        content: "Hello",
      }

      const message2: Message = {
        type: "message",
        role: "assistant",
        content: "Hi there",
      }

      actions.addChatHistoryEntry(message1)
      actions.addChatHistoryEntry(message2)

      expect(getState().chatHistory).toHaveLength(2)
      expect(getState().chatHistory).toEqual([message1, message2])
    })
  })

  describe("assistant message actions", () => {
    test("setcurrentAssistantMessage should set message", () => {
      const { getState, actions } = setup()

      actions.setcurrentAssistantMessage("Hello")

      expect(getState().currentAssistantMessage).toBe("Hello")
    })

    test("appendCurrentAssistantMessage should append to current message", () => {
      const { getState, actions } = setup()

      actions.setcurrentAssistantMessage("Hello")
      actions.appendCurrentAssistantMessage(" world")

      expect(getState().currentAssistantMessage).toBe("Hello world")
    })

    test("clearCurrentAssistantMessage should clear message", () => {
      const { getState, actions } = setup()

      actions.setcurrentAssistantMessage("Hello")
      actions.clearCurrentAssistantMessage()

      expect(getState().currentAssistantMessage).toBe("")
    })
  })

  describe("tool use actions", () => {
    test("addToolUse should add tool to current tool uses", () => {
      const { getState, actions } = setup()

      const toolUse: ToolUse = {
        type: "tool_use",
        name: "test_tool",
        input: { param: "value" },
      }

      actions.addToolUse(toolUse)

      expect(getState().currentToolUses).toHaveLength(1)
      expect(getState().currentToolUses[0]).toEqual(toolUse)
    })

    test("setCurrentToolUses should replace all tool uses", () => {
      const { getState, actions } = setup()

      const toolUse1: ToolUse = {
        type: "tool_use",
        name: "tool1",
        input: {},
      }

      const toolUse2: ToolUse = {
        type: "tool_use",
        name: "tool2",
        input: {},
      }

      actions.addToolUse(toolUse1)
      actions.setCurrentToolUses([toolUse2])

      expect(getState().currentToolUses).toHaveLength(1)
      expect(getState().currentToolUses[0]).toEqual(toolUse2)
    })

    test("clearToolUses should clear all tool uses", () => {
      const { getState, actions } = setup()

      const toolUse: ToolUse = {
        type: "tool_use",
        name: "test_tool",
        input: {},
      }

      actions.addToolUse(toolUse)
      actions.clearToolUses()

      expect(getState().currentToolUses).toEqual([])
    })
  })

  describe("message sending actions", () => {
    test("sendMessage should set processing state and clear input", () => {
      const { getState, actions } = setup()

      actions.setInput("Hello")
      actions.sendMessage("Hello")

      expect(getState().isProcessing).toBe(true)
      expect(getState().input).toBe("")
      expect(getState().stats).toBeNull()
    })
  })

  describe("MCP server actions", () => {
    test("setMcpServers should update server status", () => {
      const { getState, actions } = setup()

      const servers: McpServerStatus[] = [
        { name: "server1", status: "connected" },
        { name: "server2", status: "error" },
      ]

      actions.setMcpServers(servers)

      expect(getState().mcpServers).toEqual(servers)
    })
  })

  describe("session actions", () => {
    test("setSessionId should update session ID", () => {
      const { getState, actions } = setup()

      actions.setSessionId("session-123")

      expect(getState().sessionId).toBe("session-123")
    })
  })

  describe("processing state actions", () => {
    test("setIsProcessing should update processing state", () => {
      const { getState, actions } = setup()

      actions.setIsProcessing(true)

      expect(getState().isProcessing).toBe(true)

      actions.setIsProcessing(false)

      expect(getState().isProcessing).toBe(false)
    })
  })

  describe("input actions", () => {
    test("setInput should update input value", () => {
      const { getState, actions } = setup()

      actions.setInput("test input")

      expect(getState().input).toBe("test input")
    })
  })

  describe("stats actions", () => {
    test("setStats should update stats", () => {
      const { getState, actions } = setup()

      const statsString = "Cost: $0.01 | Duration: 2.5s"

      actions.setStats(statsString)

      expect(getState().stats).toBe(statsString)
    })

    test("setStats should accept null", () => {
      const { getState, actions } = setup()

      actions.setStats("some stats")
      actions.setStats(null)

      expect(getState().stats).toBeNull()
    })
  })

  describe("config actions", () => {
    test("setConfig should update configuration", () => {
      const { getState, actions } = setup()

      const config = {
        mcpServers: {
          server1: {
            command: "node",
            args: ["server.js"],
          },
        },
        stream: true,
      }

      actions.setConfig(config)

      expect(getState().config).toEqual(config)
    })
  })

  describe("tool permission actions", () => {
    test("setPendingToolPermission should set pending permission", () => {
      const { getState, actions } = setup()

      const permission = {
        toolName: "test_tool",
        input: { param: "value" },
      }

      actions.setPendingToolPermission(permission)

      expect(getState().pendingToolPermission).toEqual(permission)
    })

    test("setPendingToolPermission should accept undefined", () => {
      const { getState, actions } = setup()

      actions.setPendingToolPermission({
        toolName: "test",
        input: {},
      })
      actions.setPendingToolPermission(undefined)

      expect(getState().pendingToolPermission).toBeUndefined()
    })
  })

  describe("abort controller actions", () => {
    test("setAbortController should set abort controller", () => {
      const { getState, actions } = setup()

      const controller = new AbortController()

      actions.setAbortController(controller)

      expect(getState().abortController).toBe(controller)
    })

    test("abortRequest should call abort and set processing to false", () => {
      const { getState, actions } = setup()

      const controller = new AbortController()

      actions.setAbortController(controller)
      actions.setIsProcessing(true)
      actions.abortRequest()

      expect(controller.signal.aborted).toBe(true)
      expect(getState().isProcessing).toBe(false)
    })

    test("abortRequest should handle undefined controller", () => {
      const { getState, actions } = setup()

      actions.setIsProcessing(true)
      actions.abortRequest()

      expect(getState().isProcessing).toBe(false)
    })
  })

  describe("reset action", () => {
    test("reset should clear all state except config and session", () => {
      const { getState, actions } = setup()

      actions.addChatHistoryEntry({
        type: "message",
        role: "user",
        content: "Hello",
      })
      actions.setcurrentAssistantMessage("Assistant message")
      actions.addToolUse({
        type: "tool_use",
        name: "tool",
        input: {},
      })
      actions.setInput("input text")
      actions.setStats("stats")
      actions.reset()

      expect(getState().chatHistory).toEqual([])
      expect(getState().currentAssistantMessage).toBe("")
      expect(getState().currentToolUses).toEqual([])
      expect(getState().input).toBe("")
      expect(getState().stats).toBeNull()
    })
  })
})
