import { render } from "ink"
import { App } from "./App"
import { validateEnv } from "./utils/validateEnv"

const main = async () => {
  validateEnv()

  render(<App />)
}

try {
  main()
} catch (error) {
  console.error(error)
}
