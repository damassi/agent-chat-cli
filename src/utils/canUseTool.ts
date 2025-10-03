export interface CanUseToolOptions {
  messageQueue: { resolve: (value: string) => void }[]
  onToolPermissionRequest: (toolName: string, input: any) => void
}

export const createCanUseTool = (options: CanUseToolOptions) => {
  const { messageQueue, onToolPermissionRequest } = options

  return async (toolName: string, input: any) => {
    // Notify UI
    onToolPermissionRequest(toolName, input)

    const userResponse = await new Promise<string>((resolve) => {
      messageQueue.push({ resolve })
    })

    const response = userResponse.toLowerCase().trim()

    // Enter pressed (empty) or explicit "y"/"yes"/"allow"
    if (!response || ["y", "yes", "allow"].includes(response)) {
      return { behavior: "allow" as const, updatedInput: input }
    }

    // ESC or explicit "n"/"no"/"deny"
    if (["n", "no", "deny"].includes(response)) {
      return {
        behavior: "deny" as const,
        message: "User denied permission",
        interrupt: true,
      }
    }

    // Any other input is treated as a deny
    return {
      behavior: "deny" as const,
      message: "User modified input",
      interrupt: true,
    }
  }
}
