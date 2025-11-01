import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test"
import { validateEnv } from "../validateEnv"

describe("validateEnv", () => {
  const originalEnv = { ...process.env }
  let consoleErrorSpy: any
  let processExitSpy: any

  beforeEach(() => {
    consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {})
    processExitSpy = spyOn(process, "exit").mockImplementation(
      (() => {}) as never
    )
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    consoleErrorSpy.mockRestore()
    processExitSpy.mockRestore()
  })

  test("should pass when all required environment variables are present", () => {
    process.env.ANTHROPIC_API_KEY = "test-key"

    validateEnv()

    expect(consoleErrorSpy).not.toHaveBeenCalled()
    expect(processExitSpy).not.toHaveBeenCalled()
  })

  test("should exit when ANTHROPIC_API_KEY is missing", () => {
    delete process.env.ANTHROPIC_API_KEY

    validateEnv()

    expect(consoleErrorSpy).toHaveBeenCalled()
    expect(processExitSpy).toHaveBeenCalledWith(1)
  })

  test("should display helpful error message with missing variables", () => {
    delete process.env.ANTHROPIC_API_KEY

    validateEnv()

    const errorMessage = consoleErrorSpy.mock.calls[0][0]
    expect(errorMessage).toContain("ANTHROPIC_API_KEY")
  })
})
