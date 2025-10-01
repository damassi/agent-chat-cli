import { Text } from "ink"
import { marked } from "marked"
import React from "react"

export const Markdown: React.PropsWithChildren<any> = ({ children }) => {
  const tokens = marked.lexer(children)
  return <>{tokens.map(renderToken)}</>
}

const renderInline = (tokens: any[]): React.ReactNode[] => {
  return tokens.map((token, idx) => {
    switch (token.type) {
      case "strong":
        return (
          <Text key={idx} bold>
            {renderInline(token.tokens)}
          </Text>
        )
      case "em":
        return (
          <Text key={idx} italic>
            {renderInline(token.tokens)}
          </Text>
        )
      case "codespan":
        return (
          <Text key={idx} color="cyan">
            {token.text}
          </Text>
        )
      case "del":
        return (
          <Text key={idx} strikethrough>
            {renderInline(token.tokens)}
          </Text>
        )
      case "link":
        return (
          <Text key={idx} color="blue" underline>
            {renderInline(token.tokens)}
          </Text>
        )
      case "text":
        return <Text key={idx}>{token.text}</Text>
      default:
        return <Text key={idx}>{token.raw || ""}</Text>
    }
  })
}

const renderToken = (token: any, idx: number): React.ReactNode => {
  switch (token.type) {
    case "paragraph":
      return <Text key={idx}>{renderInline(token.tokens)}</Text>
    case "heading":
      return (
        <Text key={idx} bold color="cyan">
          {renderInline(token.tokens)}
        </Text>
      )
    case "list":
      return (
        <React.Fragment key={idx}>
          {token.items.map((item: any, itemIdx: number) => {
            // List items contain nested tokens (usually paragraphs with text)
            const content = item.tokens
              .map((t: any) => {
                if (t.type === "text" && t.tokens) {
                  return renderInline(t.tokens)
                }
                return null
              })
              .filter(Boolean)

            return (
              <Text key={itemIdx}>
                • {content}
              </Text>
            )
          })}
        </React.Fragment>
      )
    case "code":
      return (
        <Text key={idx} color="gray">
          {token.text}
        </Text>
      )
    case "blockquote":
      return (
        <Text key={idx} dimColor>
          {renderInline(token.tokens)}
        </Text>
      )
    case "space":
      return <Text key={idx}> </Text>
    case "hr":
      return <Text key={idx}>{"─".repeat(60)}</Text>
    default:
      return <Text key={idx}>{token.raw}</Text>
  }
}
