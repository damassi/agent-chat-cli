import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk"

export interface AgentConfig {
  description: string
  prompt: () => Promise<string>
  mcpServers?: string[]
}

export const createAgent = (options: AgentConfig): AgentConfig => {
  return options
}

/**
 * We need to convert our async config format into the format that
 * claude-agent-sdk accepts.
 */
export const createSDKAgents = async (
  agents?: Record<string, AgentConfig>
): Promise<Record<string, AgentDefinition> | undefined> => {
  if (!agents) {
    return undefined
  }

  const entries = await Promise.all(
    Object.entries(agents).map(async ([name, agent]) => {
      const prompt = await agent.prompt()

      return [
        name,
        {
          description: agent.description,
          prompt,
        },
      ] as const
    })
  )

  const sdkAgents = Object.fromEntries(entries)

  return sdkAgents
}
