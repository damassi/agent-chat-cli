import { readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))

export const getPrompt = (filename: string): string => {
  const path = resolve(__dirname, "src/prompts", filename)
  return readFileSync(path, "utf-8").trim()
}
