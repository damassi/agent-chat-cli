import type { MessageQueue } from "utils/MessageQueue"
import type {
  PermissionUpdate,
  PermissionResult,
} from "@anthropic-ai/claude-agent-sdk"

export interface CanUseToolOptions {
  messageQueue: MessageQueue
  onToolPermissionRequest?: (toolName: string, input: any) => void
  setIsProcessing?: (value: boolean) => void
}

export const createCanUseTool = (options: CanUseToolOptions) => {
  const { messageQueue, onToolPermissionRequest, setIsProcessing } = options

  const canUseTool = async (
    toolName: string,
    input: any,
    options: {
      signal: AbortSignal
      suggestions?: PermissionUpdate[]
    }
  ): Promise<PermissionResult> => {
    if (onToolPermissionRequest) {
      onToolPermissionRequest(toolName, input)
    }

    const userResponse = await messageQueue.waitForPermissionResponse()
    const response = userResponse.toLowerCase().trim()

    const CONFIRM = ["y", "yes", "allow"].includes(response)
    const DENY = ["n", "no", "deny"].includes(response)

    if (CONFIRM) {
      const updatedPermissions: PermissionUpdate[] | undefined = (() => {
        switch (true) {
          // Claude Agent SDK tools can be auto-updated via suggestions from SDK
          case options.suggestions && options.suggestions.length > 0: {
            return options.suggestions
          }

          // MCP tools require custom rules, since they are not known ahead
          // of time
          case toolName.startsWith("mcp__"): {
            return [
              {
                type: "addRules",
                rules: [{ toolName }],
                behavior: "allow",
                destination: "session",
              },
            ]
          }
        }
      })()

      return {
        behavior: "allow",
        updatedInput: input,
        updatedPermissions,
      }
    }

    // Keep isProcessing true so UI shows "Agent is thinking..." while it responds
    if (setIsProcessing) {
      setTimeout(() => {
        setIsProcessing(true)
      }, 50)
    }

    if (DENY) {
      return {
        behavior: "deny",
        message: "User denied permission",
        interrupt: true,
      }
    }

    // If user typed anything other than yes/no, pass it as new input
    // and interrupt.
    return {
      behavior: "deny",
      message: userResponse,
      interrupt: true,
    }
  }

  return canUseTool
}
