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
          "setCurrentAssistantMessage",
          "setCurrentToolUses",
          "setInput",
          "setIsProcessing",
          "setMcpServers",
          "setSessionId",
          "setStats",
          "handleMcpServerStatus",
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
    test("setCurrentAssistantMessage should set message", () => {
      const { getState, actions } = setup()

      actions.setCurrentAssistantMessage("Hello")

      expect(getState().currentAssistantMessage).toBe("Hello")
    })

    test("appendCurrentAssistantMessage should append to current message", () => {
      const { getState, actions } = setup()

      actions.setCurrentAssistantMessage("Hello")
      actions.appendCurrentAssistantMessage(" world")

      expect(getState().currentAssistantMessage).toBe("Hello world")
    })

    test("clearCurrentAssistantMessage should clear message", () => {
      const { getState, actions } = setup()

      actions.setCurrentAssistantMessage("Hello")
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

    test("abortRequest should save partially streamed message to chat history", () => {
      const { getState, actions } = setup()

      const controller = new AbortController()
      actions.setAbortController(controller)
      actions.setIsProcessing(true)
      actions.setCurrentAssistantMessage("This is a partial response...")

      actions.abortRequest()

      const state = getState()

      // Message should be saved to chat history
      expect(state.chatHistory).toHaveLength(1)
      expect(state.chatHistory[0]).toEqual({
        type: "message",
        role: "assistant",
        content: "This is a partial response...",
      })

      // Current message should be cleared
      expect(state.currentAssistantMessage).toBe("")

      // Stats should indicate abort
      expect(state.stats).toBe("User aborted the request.")

      // Processing should be stopped
      expect(state.isProcessing).toBe(false)
    })

    test("abortRequest should not save empty message to chat history", () => {
      const { getState, actions } = setup()

      const controller = new AbortController()
      actions.setAbortController(controller)
      actions.setIsProcessing(true)
      actions.setCurrentAssistantMessage("")

      actions.abortRequest()

      const state = getState()

      // No message should be added to history
      expect(state.chatHistory).toHaveLength(0)

      // Current message should still be empty
      expect(state.currentAssistantMessage).toBe("")

      // Stats should still indicate abort
      expect(state.stats).toBe("User aborted the request.")
    })

    test("abortRequest should not save whitespace-only message to chat history", () => {
      const { getState, actions } = setup()

      const controller = new AbortController()
      actions.setAbortController(controller)
      actions.setIsProcessing(true)
      actions.setCurrentAssistantMessage("   \n  \t  ")

      actions.abortRequest()

      const state = getState()

      // No message should be added to history (whitespace is trimmed)
      expect(state.chatHistory).toHaveLength(0)

      // Current message should still be empty
      expect(state.currentAssistantMessage).toBe("")
    })

    test("abortRequest should preserve existing chat history when adding partial message", () => {
      const { getState, actions } = setup()

      // Add existing history
      actions.addChatHistoryEntry({
        type: "message",
        role: "user",
        content: "Hello",
      })

      const controller = new AbortController()
      actions.setAbortController(controller)
      actions.setIsProcessing(true)
      actions.setCurrentAssistantMessage("Partial response")

      actions.abortRequest()

      const state = getState()

      // Should have both messages
      expect(state.chatHistory).toHaveLength(2)
      expect(state.chatHistory[0]).toEqual({
        type: "message",
        role: "user",
        content: "Hello",
      })
      expect(state.chatHistory[1]).toEqual({
        type: "message",
        role: "assistant",
        content: "Partial response",
      })
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
      actions.setCurrentAssistantMessage("Assistant message")
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

  describe("handleMcpServerStatus thunk", () => {
    test("should set mcp servers", () => {
      const { getState, actions } = setup()

      const servers: McpServerStatus[] = [
        { name: "github", status: "connected" },
        { name: "notion", status: "connected" },
      ]

      actions.handleMcpServerStatus(servers)

      expect(getState().mcpServers).toEqual(servers)
    })

    test("should add error message for failed servers", () => {
      const { getState, actions } = setup()

      const servers: McpServerStatus[] = [
        { name: "github", status: "connected" },
        { name: "postgres", status: "failed" },
        { name: "redis", status: "failed" },
      ]

      actions.handleMcpServerStatus(servers)

      const chatHistory = getState().chatHistory
      const errorMessage = chatHistory.find(
        (entry) =>
          entry.type === "message" &&
          entry.role === "system" &&
          "content" in entry &&
          entry.content.includes("Failed to connect")
      )

      expect(errorMessage).toBeDefined()
      expect(errorMessage?.type).toBe("message")
      if (errorMessage?.type === "message") {
        expect(errorMessage.content).toBe(
          "[Error] Failed to connect to postgres, redis"
        )
      }
    })

    test("should not add any messages when all servers connect successfully", () => {
      const { getState, actions } = setup()

      const servers: McpServerStatus[] = [
        { name: "github", status: "connected" },
        { name: "notion", status: "connected" },
      ]

      actions.handleMcpServerStatus(servers)

      const chatHistory = getState().chatHistory
      expect(chatHistory.length).toBe(0)
    })

    test("should not add message when no servers provided", () => {
      const { getState, actions } = setup()

      actions.handleMcpServerStatus([])

      const chatHistory = getState().chatHistory
      expect(chatHistory.length).toBe(0)
    })

    test("should handle only failed servers", () => {
      const { getState, actions } = setup()

      const servers: McpServerStatus[] = [
        { name: "postgres", status: "failed" },
      ]

      actions.handleMcpServerStatus(servers)

      const chatHistory = getState().chatHistory
      expect(chatHistory.length).toBe(1)
      expect(chatHistory[0]).toEqual({
        type: "message",
        role: "system",
        content: "[Error] Failed to connect to postgres",
      })
    })
  })
})
