import type { AgentChatConfig } from "./src/store"
import { createAgent } from "./src/utils/createAgent"
import { getPrompt } from "./src/utils/getPrompt"

const config: AgentChatConfig = {
  systemPrompt: getPrompt("system.md"),
  model: "sonnet",
  stream: true,

  agents: {
    "demo-agent": createAgent({
      description: "A claude subagent designed to show off functionality",
      prompt: getPrompt("agents/demo-agent.md"),
      mcpServers: [],
      disallowedTools: ["Bash"],
    }),
  },

  mcpServers: {
    chrome: {
      description:
        "The Chrome DevTools MCP server adds web browser automation and debugging capabilities to your AI agent",
      command: "bunx",
      args: ["chrome-devtools-mcp@latest"],
    },
    github: {
      description:
        "GitHub MCP tools to search code, PRs, issues; discover documentation in repo docs/; find deployment guides and code examples.",
      prompt: getPrompt("github.md"),
      command: "bunx",
      args: [
        "mcp-remote@0.1.29",
        "https://api.githubcopilot.com/mcp/readonly",
        "--header",
        `Authorization: Bearer ${process.env.GITHUB_ACCESS_TOKEN}`,
      ],
      disallowedTools: [],
      enabled: true,
    },

    notion: {
      description:
        "Notion workspace for documentation, wikis, OKRs, department pages, onboarding guides. Navigate hierarchies, search pages, retrieve structured content.",
      prompt: getPrompt("notion.md"),
      command: "bunx",
      args: ["mcp-remote@0.1.29", "https://mcp.notion.com/mcp"],
      enabled: true,
    },

    /**
    // Example of how to use getRemotePrompt

    someOtherServer: {
      description: "Some description",
      command: "bunx",
      args: ["mcp-remote@0.1.29", "https://mcp.some-server.com/mcp"],
      prompt: getRemotePrompt({
        fetchPrompt: async () => {
          const response = await fetch("https://some-prompt/name")

          if (!response.ok) {
            throw new Error(
              `[agent] [getRemotePrompt] [ERROR HTTP] status: ${response.status}`
            )
          }

          const text = await response.text()
          return text
        },
      }),
    },
    */
  },

  disallowedTools: ["Bash"],

  // Ungate MCP tools, which have their own disallowedTools array.
  permissionMode: "bypassPermissions",
}

export default config
