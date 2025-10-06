import { test, expect, describe } from "bun:test"
import { formatToolInput } from "../formatToolInput"

describe("formatToolInput", () => {
  test("should format simple object input", () => {
    const input = { param: "value" }
    const result = formatToolInput(input)

    expect(result).toBe('{\n  "param": "value"\n}')
  })

  test("should format nested object input", () => {
    const input = {
      outer: {
        inner: "value",
      },
    }
    const result = formatToolInput(input)

    expect(result).toContain('"outer"')
    expect(result).toContain('"inner"')
    expect(result).toContain('"value"')
  })

  test("should format array input", () => {
    const input = { items: ["one", "two", "three"] }
    const result = formatToolInput(input)

    expect(result).toContain('"items"')
    expect(result).toContain('"one"')
    expect(result).toContain('"two"')
    expect(result).toContain('"three"')
  })

  test("should handle empty input", () => {
    const input = {}
    const result = formatToolInput(input)

    expect(result).toBe("{}")
  })

  test("should format GraphQL query input", () => {
    const input = {
      query: "query { user { name } }",
    }
    const result = formatToolInput(input)

    expect(result).toBe("query { user { name } }")
  })

  test("should replace escaped newlines with actual newlines", () => {
    const jsonString = JSON.stringify({ text: "line1\nline2" })
    const input = JSON.parse(jsonString)
    const result = formatToolInput(input)

    expect(result).toContain("line1\nline2")
  })

  test("should replace escaped tabs with spaces", () => {
    const jsonString = JSON.stringify({ text: "tab\there" })
    const input = JSON.parse(jsonString)
    const result = formatToolInput(input)

    expect(result).toContain("tab  here")
  })

  test("should handle null values", () => {
    const input = { value: null }
    const result = formatToolInput(input)

    expect(result).toContain('"value": null')
  })

  test("should handle number values", () => {
    const input = { count: 42, price: 19.99 }
    const result = formatToolInput(input)

    expect(result).toContain('"count": 42')
    expect(result).toContain('"price": 19.99')
  })

  test("should handle boolean values", () => {
    const input = { enabled: true, disabled: false }
    const result = formatToolInput(input)

    expect(result).toContain('"enabled": true')
    expect(result).toContain('"disabled": false')
  })
})
