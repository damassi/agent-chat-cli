import { readFileSync } from "node:fs"
import { resolve } from "node:path"

export const readPrompt = (filename: string): string => {
  const path = resolve(import.meta.dir, "../prompts", filename)
  return readFileSync(path, "utf-8").trim()
}
