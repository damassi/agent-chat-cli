import { test, expect, describe } from "bun:test"
import { getPrompt, buildSystemPrompt } from "utils/getPrompt"
import type { AgentChatConfig } from "store"

describe("getPrompt", () => {
  test("should return a lazy function", () => {
    const lazyPrompt = getPrompt("system.md")
    expect(typeof lazyPrompt).toBe("function")
  })

  test("should load system prompt from file when invoked", async () => {
    const lazyPrompt = getPrompt("system.md")
    const prompt = await lazyPrompt()

    expect(typeof prompt).toBe("string")
    expect(prompt.length).toBeGreaterThan(0)
  })

  test("should trim whitespace from prompt", async () => {
    const lazyPrompt = getPrompt("system.md")
    const prompt = await lazyPrompt()

    expect(prompt).toBe(prompt.trim())
  })
})

describe("buildSystemPrompt", () => {
  test("should include current date", async () => {
    const config: AgentChatConfig = {
      mcpServers: {},
    }

    const prompt = await buildSystemPrompt({ config })

    expect(prompt).toContain("Current date:")
  })

  test("should use default prompt when systemPrompt is not provided", async () => {
    const config: AgentChatConfig = {
      mcpServers: {},
    }

    const prompt = await buildSystemPrompt({ config })

    expect(prompt).toContain("You are a helpful agent.")
  })

  test("should use custom systemPrompt when provided", async () => {
    const config: AgentChatConfig = {
      mcpServers: {},
      systemPrompt: async () => "You are a custom agent.",
    }

    const prompt = await buildSystemPrompt({ config })

    expect(prompt).toContain("You are a custom agent.")
    expect(prompt).not.toContain("You are a helpful agent.")
  })

  test("should include MCP server prompts", async () => {
    const config: AgentChatConfig = {
      mcpServers: {
        github: {
          command: "node",
          args: [],
          description: "GitHub server",
          prompt: async () => "GitHub server instructions",
        },
      },
    }

    const prompt = await buildSystemPrompt({ config })

    expect(prompt).toContain("# github MCP Server")
    expect(prompt).toContain("GitHub server instructions")
  })

  test("should combine multiple MCP server prompts", async () => {
    const config: AgentChatConfig = {
      mcpServers: {
        github: {
          command: "node",
          args: [],
          description: "GitHub server",
          prompt: async () => "GitHub instructions",
        },
        gitlab: {
          command: "node",
          args: [],
          description: "GitLab server",
          prompt: async () => "GitLab instructions",
        },
      },
    }

    const prompt = await buildSystemPrompt({ config })

    expect(prompt).toContain("# github MCP Server")
    expect(prompt).toContain("GitHub instructions")
    expect(prompt).toContain("# gitlab MCP Server")
    expect(prompt).toContain("GitLab instructions")
  })

  test("should skip MCP servers without prompts", async () => {
    const config: AgentChatConfig = {
      mcpServers: {
        github: {
          command: "node",
          args: [],
          description: "GitHub server",
          prompt: async () => "GitHub instructions",
        },
        gitlab: {
          command: "node",
          args: [],
          description: "GitLab server",
        },
      },
    }

    const prompt = await buildSystemPrompt({ config })

    expect(prompt).toContain("# github MCP Server")
    expect(prompt).not.toContain("# gitlab MCP Server")
  })

  test("should build prompt with custom system prompt and MCP prompts", async () => {
    const config: AgentChatConfig = {
      mcpServers: {
        github: {
          command: "node",
          args: [],
          description: "GitHub server",
          prompt: async () => "GitHub instructions",
        },
      },
      systemPrompt: async () => "Custom base prompt",
    }

    const prompt = await buildSystemPrompt({ config })

    expect(prompt).toContain("Current date:")
    expect(prompt).toContain("Custom base prompt")
    expect(prompt).toContain("# github MCP Server")
    expect(prompt).toContain("GitHub instructions")
  })

  test("should include inferred MCP servers in system prompt", async () => {
    const config: AgentChatConfig = {
      mcpServers: {},
    }
    const inferredServers = new Set(["github", "gitlab"])

    const prompt = await buildSystemPrompt({
      config,
      inferredServers,
    })

    expect(prompt).toContain("Server Selection Context")
    expect(prompt).toContain("github, gitlab")
  })

  test("should include connected and failed MCP servers sections", async () => {
    const config: AgentChatConfig = {
      mcpServers: {},
    }
    const mcpServers = [
      { name: "github", status: "connected" },
      { name: "gitlab", status: "failed" },
    ]

    const prompt = await buildSystemPrompt({
      config,
      mcpServers,
    })

    expect(prompt).toContain("Available MCP Servers")
    expect(prompt).toContain("- github")
    expect(prompt).toContain("ONLY servers with available tools")
    expect(prompt).toContain("Unavailable MCP Servers")
    expect(prompt).toContain("- gitlab")
    expect(prompt).toContain("These servers have NO tools available")
  })

  test("should not include connection status sections when no mcpServers provided", async () => {
    const config: AgentChatConfig = {
      mcpServers: {},
    }

    const prompt = await buildSystemPrompt({
      config,
    })

    expect(prompt).toContain("CRITICAL: MCP Server Connection Status Check")
    expect(prompt).not.toContain("# Available MCP Servers")
    expect(prompt).not.toContain("# Unavailable MCP Servers")
  })

  test("should handle empty inferred servers set", async () => {
    const config: AgentChatConfig = {
      mcpServers: {},
    }
    const inferredServers = new Set<string>()

    const prompt = await buildSystemPrompt({
      config,
      inferredServers,
    })

    expect(prompt).toContain("Current date:")
    expect(prompt).not.toContain("Server Selection Context")
  })

  test("should work without inferredServers parameter", async () => {
    const config: AgentChatConfig = {
      mcpServers: {},
    }

    const prompt = await buildSystemPrompt({ config })

    expect(prompt).toContain("Current date:")
    expect(prompt).not.toContain("Server Selection Context")
  })

  test("should skip disabled MCP servers", async () => {
    const config: AgentChatConfig = {
      mcpServers: {
        github: {
          command: "node",
          args: [],
          description: "GitHub server",
          prompt: async () => "GitHub instructions",
          enabled: true,
        },
        gitlab: {
          command: "node",
          args: [],
          description: "GitLab server",
          prompt: async () => "GitLab instructions",
          enabled: false,
        },
      },
    }

    const prompt = await buildSystemPrompt({ config })

    expect(prompt).toContain("# github MCP Server")
    expect(prompt).toContain("GitHub instructions")
    expect(prompt).not.toContain("# gitlab MCP Server")
    expect(prompt).not.toContain("GitLab instructions")
  })
})
