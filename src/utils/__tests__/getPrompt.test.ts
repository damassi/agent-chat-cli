import { test, expect, describe } from "bun:test"
import { getPrompt, buildSystemPrompt } from "utils/getPrompt"
import type { AgentChatConfig } from "store"

describe("getPrompt", () => {
  test("should load system prompt from file", () => {
    const prompt = getPrompt("system.md")

    expect(typeof prompt).toBe("string")
    expect(prompt.length).toBeGreaterThan(0)
  })

  test("should trim whitespace from prompt", () => {
    const prompt = getPrompt("system.md")

    expect(prompt).toBe(prompt.trim())
  })
})

describe("buildSystemPrompt", () => {
  test("should include current date", () => {
    const config: AgentChatConfig = {
      mcpServers: {},
    }

    const prompt = buildSystemPrompt(config)

    expect(prompt).toContain("Current date:")
  })

  test("should use default prompt when systemPrompt is not provided", () => {
    const config: AgentChatConfig = {
      mcpServers: {},
    }

    const prompt = buildSystemPrompt(config)

    expect(prompt).toContain("You are a helpful agent.")
  })

  test("should use custom systemPrompt when provided", () => {
    const config: AgentChatConfig = {
      mcpServers: {},
      systemPrompt: "You are a custom agent.",
    }

    const prompt = buildSystemPrompt(config)

    expect(prompt).toContain("You are a custom agent.")
    expect(prompt).not.toContain("You are a helpful agent.")
  })

  test("should include MCP server prompts", () => {
    const config: AgentChatConfig = {
      mcpServers: {
        github: {
          command: "node",
          args: [],
          prompt: "GitHub server instructions",
        },
      },
    }

    const prompt = buildSystemPrompt(config)

    expect(prompt).toContain("# github MCP Server")
    expect(prompt).toContain("GitHub server instructions")
  })

  test("should combine multiple MCP server prompts", () => {
    const config: AgentChatConfig = {
      mcpServers: {
        github: {
          command: "node",
          args: [],
          prompt: "GitHub instructions",
        },
        gitlab: {
          command: "node",
          args: [],
          prompt: "GitLab instructions",
        },
      },
    }

    const prompt = buildSystemPrompt(config)

    expect(prompt).toContain("# github MCP Server")
    expect(prompt).toContain("GitHub instructions")
    expect(prompt).toContain("# gitlab MCP Server")
    expect(prompt).toContain("GitLab instructions")
  })

  test("should skip MCP servers without prompts", () => {
    const config: AgentChatConfig = {
      mcpServers: {
        github: {
          command: "node",
          args: [],
          prompt: "GitHub instructions",
        },
        gitlab: {
          command: "node",
          args: [],
        },
      },
    }

    const prompt = buildSystemPrompt(config)

    expect(prompt).toContain("# github MCP Server")
    expect(prompt).not.toContain("# gitlab MCP Server")
  })

  test("should build prompt with custom system prompt and MCP prompts", () => {
    const config: AgentChatConfig = {
      mcpServers: {
        github: {
          command: "node",
          args: [],
          prompt: "GitHub instructions",
        },
      },
      systemPrompt: "Custom base prompt",
    }

    const prompt = buildSystemPrompt(config)

    expect(prompt).toContain("Current date:")
    expect(prompt).toContain("Custom base prompt")
    expect(prompt).toContain("# github MCP Server")
    expect(prompt).toContain("GitHub instructions")
  })
})
