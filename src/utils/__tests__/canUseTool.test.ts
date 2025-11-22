import { test, expect, describe, mock } from "bun:test"
import { createCanUseTool } from "../canUseTool"
import { MessageQueue } from "../MessageQueue"
import type { PermissionUpdate } from "@anthropic-ai/claude-agent-sdk"

describe("createCanUseTool", () => {
  test("should allow tool when user responds with 'yes'", async () => {
    const queue = new MessageQueue()
    const canUseTool = createCanUseTool({ messageQueue: queue })

    const promise = canUseTool(
      "test_tool",
      { param: "value" },
      {
        signal: new AbortController().signal,
      }
    )

    queue.sendPermissionResponse("yes")
    const result = await promise

    expect(result.behavior).toBe("allow")
    if (result.behavior === "allow") {
      expect(result.updatedInput).toEqual({ param: "value" })
    }
  })

  test("should allow tool when user responds with 'y'", async () => {
    const queue = new MessageQueue()
    const canUseTool = createCanUseTool({ messageQueue: queue })

    const promise = canUseTool(
      "test_tool",
      {},
      {
        signal: new AbortController().signal,
      }
    )

    queue.sendPermissionResponse("y")
    const result = await promise

    expect(result.behavior).toBe("allow")
  })

  test("should allow tool when user responds with 'allow'", async () => {
    const queue = new MessageQueue()
    const canUseTool = createCanUseTool({ messageQueue: queue })

    const promise = canUseTool(
      "test_tool",
      {},
      {
        signal: new AbortController().signal,
      }
    )

    queue.sendPermissionResponse("allow")
    const result = await promise

    expect(result.behavior).toBe("allow")
  })

  test("should deny tool when user responds with 'no'", async () => {
    const queue = new MessageQueue()
    const canUseTool = createCanUseTool({ messageQueue: queue })

    const promise = canUseTool(
      "test_tool",
      {},
      {
        signal: new AbortController().signal,
      }
    )

    queue.sendPermissionResponse("no")
    const result = await promise

    expect(result.behavior).toBe("deny")
    if (result.behavior === "deny") {
      expect(result.message).toBe("User denied permission")
      expect(result.interrupt).toBe(true)
    }
  })

  test("should deny tool when user responds with 'n'", async () => {
    const queue = new MessageQueue()
    const canUseTool = createCanUseTool({ messageQueue: queue })

    const promise = canUseTool(
      "test_tool",
      {},
      {
        signal: new AbortController().signal,
      }
    )

    queue.sendPermissionResponse("n")
    const result = await promise

    expect(result.behavior).toBe("deny")
  })

  test("should deny tool when user responds with 'deny'", async () => {
    const queue = new MessageQueue()
    const canUseTool = createCanUseTool({ messageQueue: queue })

    const promise = canUseTool(
      "test_tool",
      {},
      {
        signal: new AbortController().signal,
      }
    )

    queue.sendPermissionResponse("deny")
    const result = await promise

    expect(result.behavior).toBe("deny")
  })

  test("should handle case-insensitive responses", async () => {
    const queue = new MessageQueue()
    const canUseTool = createCanUseTool({ messageQueue: queue })

    const promise = canUseTool(
      "test_tool",
      {},
      {
        signal: new AbortController().signal,
      }
    )

    queue.sendPermissionResponse("YES")
    const result = await promise

    expect(result.behavior).toBe("allow")
  })

  test("should handle whitespace in responses", async () => {
    const queue = new MessageQueue()
    const canUseTool = createCanUseTool({ messageQueue: queue })

    const promise = canUseTool(
      "test_tool",
      {},
      {
        signal: new AbortController().signal,
      }
    )

    queue.sendPermissionResponse("  yes  ")
    const result = await promise

    expect(result.behavior).toBe("allow")
  })

  test("should treat other input as new message and deny", async () => {
    const queue = new MessageQueue()
    const canUseTool = createCanUseTool({ messageQueue: queue })

    const promise = canUseTool(
      "test_tool",
      {},
      {
        signal: new AbortController().signal,
      }
    )

    queue.sendPermissionResponse("do something else")
    const result = await promise

    expect(result.behavior).toBe("deny")
    if (result.behavior === "deny") {
      expect(result.message).toBe("do something else")
      expect(result.interrupt).toBe(true)
    }
  })

  test("should call onToolPermissionRequest callback", async () => {
    const queue = new MessageQueue()
    const callback = mock(() => {})
    const canUseTool = createCanUseTool({
      messageQueue: queue,
      onToolPermissionRequest: callback,
    })

    const promise = canUseTool(
      "test_tool",
      { param: "value" },
      {
        signal: new AbortController().signal,
      }
    )

    queue.sendPermissionResponse("yes")
    await promise

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith("test_tool", { param: "value" })
  })

  test("should add MCP tool rules when allowing MCP tools", async () => {
    const queue = new MessageQueue()
    const canUseTool = createCanUseTool({ messageQueue: queue })

    const promise = canUseTool(
      "mcp__github__search",
      {},
      {
        signal: new AbortController().signal,
      }
    )

    queue.sendPermissionResponse("yes")
    const result = await promise

    expect(result.behavior).toBe("allow")
    if (result.behavior === "allow") {
      expect(result.updatedPermissions).toEqual([
        {
          type: "addRules",
          rules: [{ toolName: "mcp__github__search" }],
          behavior: "allow",
          destination: "session",
        },
      ])
    }
  })

  test("should use suggestions for non-MCP tools", async () => {
    const queue = new MessageQueue()
    const canUseTool = createCanUseTool({ messageQueue: queue })

    const suggestions: PermissionUpdate[] = [
      {
        type: "addRules",
        rules: [{ toolName: "regular_tool" }],
        behavior: "allow",
        destination: "session",
      },
    ]

    const promise = canUseTool(
      "regular_tool",
      {},
      {
        signal: new AbortController().signal,
        suggestions,
      }
    )

    queue.sendPermissionResponse("yes")
    const result = await promise

    expect(result.behavior).toBe("allow")
    if (result.behavior === "allow") {
      expect(result.updatedPermissions).toEqual(suggestions)
    }
  })

  test("should call setIsProcessing on deny", async () => {
    const queue = new MessageQueue()
    const setIsProcessing = mock(() => {})
    const canUseTool = createCanUseTool({
      messageQueue: queue,
      setIsProcessing,
    })

    const promise = canUseTool(
      "test_tool",
      {},
      {
        signal: new AbortController().signal,
      }
    )

    queue.sendPermissionResponse("no")
    await promise
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(setIsProcessing).toHaveBeenCalledWith(true)
  })
})
