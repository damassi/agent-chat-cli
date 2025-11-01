import React from "react"
import { render } from "ink-testing-library"
import { test, expect, describe } from "bun:test"
import { Markdown } from "../Markdown"

describe("Markdown", () => {
  test("should render plain text", () => {
    const { lastFrame } = render(<Markdown>Hello world</Markdown>)

    expect(lastFrame()).toContain("Hello world")
  })

  test("should render bold text", () => {
    const { lastFrame } = render(<Markdown>**bold text**</Markdown>)

    expect(lastFrame()).toContain("bold text")
  })

  test("should render italic text", () => {
    const { lastFrame } = render(<Markdown>*italic text*</Markdown>)

    expect(lastFrame()).toContain("italic text")
  })

  test("should render inline code", () => {
    const { lastFrame } = render(<Markdown>`code`</Markdown>)

    expect(lastFrame()).toContain("code")
  })

  test("should render code blocks", () => {
    const { lastFrame } = render(
      <Markdown>{`\`\`\`\nconst x = 1;\n\`\`\``}</Markdown>
    )

    expect(lastFrame()).toContain("const x = 1;")
  })

  test("should render headers", () => {
    const { lastFrame } = render(<Markdown># Heading</Markdown>)

    expect(lastFrame()).toContain("Heading")
  })

  test("should render lists", () => {
    const { lastFrame } = render(
      <Markdown>{`- Item 1\n- Item 2\n- Item 3`}</Markdown>
    )

    expect(lastFrame()).toContain("Item 1")
    expect(lastFrame()).toContain("Item 2")
    expect(lastFrame()).toContain("Item 3")
    expect(lastFrame()).toContain("•")
  })

  test("should render links", () => {
    const { lastFrame } = render(
      <Markdown>[link text](https://example.com)</Markdown>
    )

    expect(lastFrame()).toContain("link text")
  })

  test("should render strikethrough", () => {
    const { lastFrame } = render(<Markdown>~~strikethrough~~</Markdown>)

    expect(lastFrame()).toContain("strikethrough")
  })

  test("should render blockquotes", () => {
    const content = "> Quote text"
    const { lastFrame } = render(<Markdown>{content}</Markdown>)

    expect(lastFrame()).toContain("Quote text")
  })

  test("should render horizontal rules", () => {
    const { lastFrame } = render(<Markdown>---</Markdown>)

    expect(lastFrame()).toContain("─")
  })

  test("should render mixed content", () => {
    const { lastFrame } = render(
      <Markdown>{`# Title\n\nSome **bold** and *italic* text with \`code\`.`}</Markdown>
    )

    expect(lastFrame()).toContain("Title")
    expect(lastFrame()).toContain("bold")
    expect(lastFrame()).toContain("italic")
    expect(lastFrame()).toContain("code")
  })

  test("should render nested lists", () => {
    const markdown = `1. **Configure AWS credentials** using one of these methods:
   - Set the AWS_PROFILE environment variable
   - Run aws sso login --profile <your-profile>
   - Ensure credentials are in ~/.aws/credentials

2. **Verify IAM permissions** - Your credentials need:
   - redshift:DescribeClusters
   - redshift-data:ExecuteStatement`

    const { lastFrame } = render(<Markdown>{markdown}</Markdown>)

    expect(lastFrame()).toContain("Configure AWS credentials")
    expect(lastFrame()).toContain("Set the AWS_PROFILE")
    expect(lastFrame()).toContain("Run aws sso login")
    expect(lastFrame()).toContain("Verify IAM permissions")
    expect(lastFrame()).toContain("redshift:DescribeClusters")
  })
})
