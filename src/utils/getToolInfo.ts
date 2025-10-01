export const getToolInfo = (toolName: string) => {
  const parts = toolName.split("__")
  const serverName = parts.length >= 3 && parts[0] === "mcp" ? parts[1] : null
  const name = serverName ? parts.slice(2).join("__") : toolName

  return { serverName, toolName: name }
}
