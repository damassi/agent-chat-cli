import type { McpServerConfig } from "@anthropic-ai/claude-agent-sdk"
import { readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))

type McpServerConfigWithPrompt = McpServerConfig & {
  prompt?: string
}

export const getPrompt = (filename: string): string => {
  const path = resolve(__dirname, "../prompts", filename)
  return readFileSync(path, "utf-8").trim()
}

export const buildSystemPrompt = (
  mcpServers: Record<string, McpServerConfigWithPrompt>
): string => {
  return Object.entries(mcpServers)
    .filter(([_, config]) => config.prompt)
    .map(([name, config]) => `# ${name} MCP Server\n\n${config.prompt}`)
    .join("\n\n")
}
