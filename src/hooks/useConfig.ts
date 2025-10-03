import { useEffect } from "react"
import { AgentStore } from "store"
import { loadConfig } from "utils/loadConfig"

export const useConfig = () => {
  const config = AgentStore.useStoreState((state) => state.config)
  const actions = AgentStore.useStoreActions((actions) => actions)

  useEffect(() => {
    if (config) return

    const init = async () => {
      try {
        const loadedConfig = await loadConfig()
        actions.setConfig(loadedConfig)
      } catch (error) {
        console.error("[agent-chat-cli] Failed to load config:", error)
        process.exit(1)
      }
    }

    init()
  }, [config, actions])

  return config
}
