import type { Options } from "@anthropic-ai/claude-agent-sdk"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import type { AgentChatConfig } from "store"

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
  connectedServers?: Set<string>
}

export const buildSystemPrompt = async ({
  config,
  additionalSystemPrompt = "",
  connectedServers = new Set(),
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

  const connectedMCPServers = Array.from(connectedServers).join(", ")

  parts.push(
    `# Connected MCP Servers

**The following MCP servers are currently connected and available: ${connectedMCPServers}**

- **IMPORTANT**: Only use tools from these connected servers.
- If a user asks about a tool or server that is not in this list, immediately inform them that the server is not connected and cannot be used.
`
  )

  parts.push(basePrompt)

  if (mcpPrompts) {
    parts.push(mcpPrompts)
  }

  return parts.join("\n\n")
}
