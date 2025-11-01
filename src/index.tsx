import { render } from "ink"
import { AgentStore } from "store"
import { validateEnv } from "utils/validateEnv"
import { App } from "./App"

const main = () => {
  validateEnv()

  console.clear()

  render(
    <AgentStore.Provider>
      <App />
    </AgentStore.Provider>
  )
}

try {
  main()
} catch (error) {
  console.error("[agent-chat-cli] [ERROR]:", error)
}
