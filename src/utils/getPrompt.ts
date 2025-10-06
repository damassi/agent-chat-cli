import type { AgentChatConfig } from "store"
import { readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))

export const getPrompt = (filename: string): string => {
  const path = resolve(__dirname, "../prompts", filename)
  return readFileSync(path, "utf-8").trim()
}

export const buildSystemPrompt = (config: AgentChatConfig): string => {
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const dateHeader = `Current date: ${currentDate}`
  const basePrompt = config.systemPrompt ?? "You are a helpful agent."

  const mcpPrompts = Object.entries(config.mcpServers)
    .filter(([_, serverConfig]) => serverConfig.prompt)
    .map(
      ([name, serverConfig]) => `# ${name} MCP Server\n\n${serverConfig.prompt}`
    )
    .join("\n\n")

  if (!mcpPrompts) {
    return `${dateHeader}\n\n${basePrompt}`
  }

  return `${dateHeader}\n\n${basePrompt}\n\n${mcpPrompts}`
}
