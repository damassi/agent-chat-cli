import { test, expect, describe, beforeEach, afterEach, spyOn } from "bun:test"
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
    process.env.GITHUB_ACCESS_TOKEN = "test-github"

    validateEnv()

    expect(consoleErrorSpy).not.toHaveBeenCalled()
    expect(processExitSpy).not.toHaveBeenCalled()
  })

  test("should exit when ANTHROPIC_API_KEY is missing", () => {
    delete process.env.ANTHROPIC_API_KEY
    process.env.GITHUB_ACCESS_TOKEN = "test-github"

    validateEnv()

    expect(consoleErrorSpy).toHaveBeenCalled()
    expect(processExitSpy).toHaveBeenCalledWith(1)
  })

  test("should exit when GITHUB_ACCESS_TOKEN is missing", () => {
    process.env.ANTHROPIC_API_KEY = "test-key"
    delete process.env.GITHUB_ACCESS_TOKEN

    validateEnv()

    expect(consoleErrorSpy).toHaveBeenCalled()
    expect(processExitSpy).toHaveBeenCalledWith(1)
  })

  test("should exit when all environment variables are missing", () => {
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.GITHUB_ACCESS_TOKEN

    validateEnv()

    expect(consoleErrorSpy).toHaveBeenCalled()
    expect(processExitSpy).toHaveBeenCalledWith(1)
  })

  test("should display helpful error message with missing variables", () => {
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.GITHUB_ACCESS_TOKEN

    validateEnv()

    const errorMessage = consoleErrorSpy.mock.calls[0][0]
    expect(errorMessage).toContain("ANTHROPIC_API_KEY")
    expect(errorMessage).toContain("GITHUB_ACCESS_TOKEN")
  })
})
