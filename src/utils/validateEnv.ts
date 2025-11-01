export function validateEnv() {
  const requiredEnvVars = {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  }

  const missingVars = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key)

  if (missingVars.length > 0) {
    console.error(
      `\n[agent-chat-cli] Missing required environment variables:\n${missingVars
        .map((v) => `  - ${v}`)
        .join("\n")}\n`
    )
    console.error(
      "[agent-chat-cli] Please copy .env.example to .env and fill in the values.\n"
    )

    process.exit(1)
  }
}
