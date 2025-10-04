import type { MessageQueue } from "utils/MessageQueue"

export interface CanUseToolOptions {
  messageQueue: MessageQueue
  onToolPermissionRequest: (toolName: string, input: any) => void
}

export const createCanUseTool = (options: CanUseToolOptions) => {
  const { messageQueue, onToolPermissionRequest } = options

  return async (toolName: string, input: any) => {
    onToolPermissionRequest(toolName, input)

    const userResponse = await messageQueue.waitForMessage()
    const response = userResponse.toLowerCase().trim()

    if (!response || ["y", "yes", "allow"].includes(response)) {
      return { behavior: "allow" as const, updatedInput: input }
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
