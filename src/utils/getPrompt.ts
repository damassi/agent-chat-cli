import type { Options } from "@anthropic-ai/claude-agent-sdk"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import type { AgentChatConfig, McpServerStatus } from "store"

const __dirname = dirname(fileURLToPath(import.meta.url))

export const getPrompt = (filename: string) => {
  return async (): Promise<string> => {
    const path = resolve(__dirname, "../prompts", filename)
    return readFileSync(path, "utf-8").trim()
  }
}

interface BuildSystemPromptProps {
  config: AgentChatConfig
  additionalSystemPrompt?: string
  inferredServers?: Set<string>
  mcpServers?: McpServerStatus[]
}

export const buildSystemPrompt = async ({
  config,
  additionalSystemPrompt = "",
  inferredServers = new Set(),
  mcpServers = [],
}: BuildSystemPromptProps): Promise<Options["systemPrompt"]> => {
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const dateHeader = `Current date: ${currentDate}`
  const basePrompt = config.systemPrompt
    ? await config.systemPrompt()
    : "You are a helpful agent."

  const mcpPromptEntries = await Promise.all(
    Object.entries(config.mcpServers)
      .filter(
        ([_, serverConfig]) =>
          serverConfig.enabled !== false && serverConfig.prompt
      )
      .map(async ([name, serverConfig]) => {
        const prompt = serverConfig.prompt ? await serverConfig.prompt() : ""
        return `# ${name} MCP Server\n\n${prompt}`
      })
  )

  const mcpPrompts = mcpPromptEntries.join("\n\n")

  const parts = [dateHeader]

  if (additionalSystemPrompt) {
    parts.push(additionalSystemPrompt)
  }

  if (mcpServers.length > 0) {
    // Add connection status sections first as these are the source of truth.
    // Inference is secondary.
    const connectedServers = mcpServers
      .filter((s) => s.status === "connected")
      .map((s) => s.name)
    const failedServers = mcpServers
      .filter((s) => s.status === "failed")
      .map((s) => s.name)

    if (connectedServers.length > 0) {
      parts.push(
        `# Available MCP Servers

The following MCP servers are **currently connected**:
${connectedServers.map((s) => `- ${s}`).join("\n")}

These are the ONLY servers with available tools. Use mcp_[servername]_[toolname] to call their tools.
`
      )
    }

    if (failedServers.length > 0) {
      parts.push(
        `# Unavailable MCP Servers

The following MCP servers **failed to connect**:
${failedServers.map((s) => `- ${s}`).join("\n")}

These servers have NO tools available. If a user requests functionality from these servers, inform them that the connection failed and the feature is temporarily unavailable.
`
      )
    }
  }

  const inferredMCPServers = Array.from(inferredServers).join(", ")

  if (inferredMCPServers) {
    parts.push(
      `# Server Selection Context

The following servers were inferred as potentially needed: ${inferredMCPServers}

Note: This is context about what was _should_ connect based on inference from the users question, not about what has actually connected. **Refer to the "Available MCP Servers" and "Unavailable MCP Servers" sections above for which servers actually have tools.**
`
    )
  }

  parts.push(basePrompt)

  if (mcpPrompts) {
    parts.push(mcpPrompts)
  }

  return parts.join("\n\n")
}
