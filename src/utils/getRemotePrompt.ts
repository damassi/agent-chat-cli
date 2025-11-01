import { getPrompt } from "./getPrompt"

interface GetRemotePromptOptions {
  fallback?: string
  fetchPrompt: () => Promise<string>
}

export const getRemotePrompt = ({
  fetchPrompt,
  fallback,
}: GetRemotePromptOptions) => {
  return async () => {
    try {
      return await fetchPrompt()
    } catch (error) {
      if (fallback) {
        return await getPrompt(fallback)()
      }

      throw new Error(
        `[agent] [getRemotePrompt] Failed to fetch remote prompt: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
}
