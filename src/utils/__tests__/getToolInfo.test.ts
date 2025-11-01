import { describe, expect, test } from "bun:test"
import type { AgentChatConfig } from "store"
import {
  getDisallowedTools,
  getToolInfo,
  isToolDisallowed,
} from "utils/getToolInfo"

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
          description: "GitHub server",
          disallowedTools: ["search_repositories", "create_issue"],
        },
      },
    }

    const result = getDisallowedTools(config)

    expect(result).toEqual([
      "mcp__github__search_repositories",
      "mcp__github__create_issue",
      "Bash",
    ])
  })

  test("should handle empty deny list", () => {
    const config: AgentChatConfig = {
      mcpServers: {
        github: {
          command: "node",
          args: [],
          description: "GitHub server",
        },
      },
    }

    const result = getDisallowedTools(config)

    expect(result).toEqual(["Bash"])
  })

  test("should handle multiple servers", () => {
    const config: AgentChatConfig = {
      mcpServers: {
        github: {
          command: "node",
          args: [],
          description: "GitHub server",
          disallowedTools: ["search"],
        },
        gitlab: {
          command: "node",
          args: [],
          description: "GitLab server",
          disallowedTools: ["merge"],
        },
      },
    }

    const result = getDisallowedTools(config)

    expect(result).toEqual([
      "mcp__github__search",
      "mcp__gitlab__merge",
      "Bash",
    ])
  })

  test("should handle servers with no disallowedTools", () => {
    const config: AgentChatConfig = {
      mcpServers: {
        github: {
          command: "node",
          args: [],
          description: "GitHub server",
          disallowedTools: ["search"],
        },
        gitlab: {
          command: "node",
          args: [],
          description: "GitLab server",
        },
      },
    }

    const result = getDisallowedTools(config)

    expect(result).toEqual(["mcp__github__search", "Bash"])
  })
})

describe("isToolDisallowed", () => {
  test("should return true for disallowed tools", () => {
    const config: AgentChatConfig = {
      mcpServers: {
        github: {
          command: "node",
          args: [],
          description: "GitHub server",
          disallowedTools: ["search_repositories"],
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
          description: "GitHub server",
          disallowedTools: ["search_repositories"],
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
          description: "GitHub server",
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
          description: "GitHub server",
          disallowedTools: ["search"],
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
