import type { MessageQueue } from "utils/MessageQueue"
import type { PermissionUpdate } from "@anthropic-ai/claude-agent-sdk"

export interface CanUseToolOptions {
  messageQueue: MessageQueue
  onToolPermissionRequest: (toolName: string, input: any) => void
}

export const createCanUseTool = (options: CanUseToolOptions) => {
  const { messageQueue, onToolPermissionRequest } = options

  return async (
    toolName: string,
    input: any,
    options: { signal: AbortSignal; suggestions: PermissionUpdate[] }
  ) => {
    onToolPermissionRequest(toolName, input)

    console.log(`[canUseTool] Tool: ${toolName}`)
    console.log(`[canUseTool] Suggestions:`, options.suggestions)

    const userResponse = await messageQueue.waitForMessage()
    const response = userResponse.toLowerCase().trim()

    if (!response || ["y", "yes", "allow"].includes(response)) {
      const result: {
        behavior: "allow"
        updatedInput: any
        updatedPermissions?: PermissionUpdate[]
      } = {
        behavior: "allow" as const,
        updatedInput: input,
      }

      if (options.suggestions && options.suggestions.length > 0) {
        console.log(
          `[canUseTool] Allowing with ${options.suggestions.length} permission updates`
        )
        result.updatedPermissions = options.suggestions
      } else if (toolName.startsWith("mcp__")) {
        // For MCP tools, create a manual permission rule since SDK doesn't provide suggestions
        console.log(
          `[canUseTool] Creating manual permission rule for MCP tool: ${toolName}`
        )
        result.updatedPermissions = [
          {
            type: "addRules",
            rules: [{ toolName }],
            behavior: "allow",
            destination: "session",
          },
        ]
      } else {
        console.log(
          `[canUseTool] No suggestions provided by SDK, cannot persist permissions`
        )
      }

      return result
    }

    if (["n", "no", "deny"].includes(response)) {
      return {
        behavior: "deny" as const,
        message: "User denied permission",
        interrupt: true,
      }
    }

    return {
      behavior: "deny" as const,
      message: "User modified input",
      interrupt: true,
    }
  }
}
