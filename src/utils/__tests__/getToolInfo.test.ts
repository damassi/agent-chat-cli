import { test, expect, describe } from "bun:test"

describe("getToolInfo", () => {
  test("should extract server name and tool name from MCP format", () => {
    // TODO: Implement test
  })

  test("should handle tool name without MCP prefix", () => {
    // TODO: Implement test
  })

  test("should handle malformed tool names", () => {
    // TODO: Implement test
  })
})

describe("getDisallowedTools", () => {
  test("should convert short names to full MCP format", () => {
    // TODO: Implement test
  })

  test("should handle empty deny list", () => {
    // TODO: Implement test
  })

  test("should handle multiple servers", () => {
    // TODO: Implement test
  })
})

describe("isToolDisallowed", () => {
  test("should return true for disallowed tools", () => {
    // TODO: Implement test
  })

  test("should return false for allowed tools", () => {
    // TODO: Implement test
  })

  test("should handle empty disallowed list", () => {
    // TODO: Implement test
  })
})
