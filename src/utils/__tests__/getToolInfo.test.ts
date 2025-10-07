import { test, expect, describe } from "bun:test"
import {
  getToolInfo,
  getDisallowedTools,
  isToolDisallowed,
} from "utils/getToolInfo"
import type { AgentChatConfig } from "store"

describe("getToolInfo", () => {
  test("should extract server name and tool name from MCP format", () => {
    const result = getToolInfo("mcp__github__search_repositories")

    expect(result.serverName).toBe("github")
    expect(result.toolName).toBe("search_repositories")
  })

  test("should handle tool name without MCP prefix", () => {
    const result = getToolInfo("regular_tool")

    expect(result.serverName).toBeNull()
    expect(result.toolName).toBe("regular_tool")
  })

  test("should handle tool names with multiple underscores", () => {
    const result = getToolInfo("mcp__server__tool__with__underscores")

    expect(result.serverName).toBe("server")
    expect(result.toolName).toBe("tool__with__underscores")
  })

  test("should handle malformed tool names", () => {
    const result = getToolInfo("mcp__only_one_part")

    expect(result.serverName).toBeNull()
    expect(result.toolName).toBe("mcp__only_one_part")
  })

  test("should handle empty string", () => {
    const result = getToolInfo("")

    expect(result.serverName).toBeNull()
    expect(result.toolName).toBe("")
  })
})

describe("getDisallowedTools", () => {
  test("should convert short names to full MCP format", () => {
    const config: AgentChatConfig = {
      mcpServers: {
        github: {
          command: "node",
          args: [],
          denyTools: ["search_repositories", "create_issue"],
        },
      },
    }

    const result = getDisallowedTools(config)

    expect(result).toEqual([
      "mcp__github__search_repositories",
      "mcp__github__create_issue",
    ])
  })

  test("should handle empty deny list", () => {
    const config: AgentChatConfig = {
      mcpServers: {
        github: {
          command: "node",
          args: [],
        },
      },
    }

    const result = getDisallowedTools(config)

    expect(result).toEqual([])
  })

  test("should handle multiple servers", () => {
    const config: AgentChatConfig = {
      mcpServers: {
        github: {
          command: "node",
          args: [],
          denyTools: ["search"],
        },
        gitlab: {
          command: "node",
          args: [],
          denyTools: ["merge"],
        },
      },
    }

    const result = getDisallowedTools(config)

    expect(result).toEqual(["mcp__github__search", "mcp__gitlab__merge"])
  })

  test("should handle servers with no denyTools", () => {
    const config: AgentChatConfig = {
      mcpServers: {
        github: {
          command: "node",
          args: [],
          denyTools: ["search"],
        },
        gitlab: {
          command: "node",
          args: [],
        },
      },
    }

    const result = getDisallowedTools(config)

    expect(result).toEqual(["mcp__github__search"])
  })
})

describe("isToolDisallowed", () => {
  test("should return true for disallowed tools", () => {
    const config: AgentChatConfig = {
      mcpServers: {
        github: {
          command: "node",
          args: [],
          denyTools: ["search_repositories"],
        },
      },
    }

    const result = isToolDisallowed({
      toolName: "mcp__github__search_repositories",
      config,
    })

    expect(result).toBe(true)
  })

  test("should return false for allowed tools", () => {
    const config: AgentChatConfig = {
      mcpServers: {
        github: {
          command: "node",
          args: [],
          denyTools: ["search_repositories"],
        },
      },
    }

    const result = isToolDisallowed({
      toolName: "mcp__github__create_issue",
      config,
    })

    expect(result).toBe(false)
  })

  test("should handle empty disallowed list", () => {
    const config: AgentChatConfig = {
      mcpServers: {
        github: {
          command: "node",
          args: [],
        },
      },
    }

    const result = isToolDisallowed({
      toolName: "mcp__github__any_tool",
      config,
    })

    expect(result).toBe(false)
  })

  test("should handle non-MCP tool names", () => {
    const config: AgentChatConfig = {
      mcpServers: {
        github: {
          command: "node",
          args: [],
          denyTools: ["search"],
        },
      },
    }

    const result = isToolDisallowed({
      toolName: "regular_tool",
      config,
    })

    expect(result).toBe(false)
  })
})
