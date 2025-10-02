import { AgentStore } from "./store"
import { AgentChat } from "./AgentChat"
import { useConfig } from "./hooks/useConfig"

export const App = () => {
  useConfig()

  const isBooted = AgentStore.useStoreState((state) => state.isBooted)

  if (!isBooted) {
    return null
  }

  return <AgentChat />
}
