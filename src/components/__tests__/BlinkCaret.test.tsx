import React from "react"
import { render } from "ink-testing-library"
import { test, expect, describe } from "bun:test"
import { BlinkCaret } from "../BlinkCaret"

describe("BlinkCaret", () => {
  test("should render caret symbol", () => {
    const { lastFrame } = render(<BlinkCaret />)

    expect(lastFrame()).toContain("▷")
  })

  test("should not blink when disabled", () => {
    const { lastFrame } = render(<BlinkCaret enabled={false} />)

    expect(lastFrame()).toContain("▷")
  })

  test("should render when enabled", () => {
    const { lastFrame } = render(<BlinkCaret enabled={true} />)

    expect(lastFrame()).toContain("▷")
  })

  test("should cleanup on unmount", () => {
    const { unmount } = render(<BlinkCaret enabled={true} />)

    unmount()
  })
})
