import { render } from "ink"
import { App } from "./App"
import { validateEnv } from "./utils/validateEnv"
import { AgentStore } from "./store"

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
  console.error(error)
}
