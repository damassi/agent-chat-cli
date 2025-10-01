const GRAPHQL_INPUT = (input: Record<string, unknown>): boolean => {
  return !!(input.query && typeof input.query === "string")
}

export const formatToolInput = (input: Record<string, unknown>): string => {
  let result: string

  switch (true) {
    case GRAPHQL_INPUT(input):
      result = input.query as string
      break

    default:
      result = JSON.stringify(input, null, 2)
      break
  }

  // Replace escaped newlines and tabs with actual characters
  return result.replace(/\\n/g, '\n').replace(/\\t/g, '  ')
}
