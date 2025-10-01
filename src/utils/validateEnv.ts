export function validateEnv() {
  const requiredEnvVars = {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    ARTSY_MCP_X_ACCESS_TOKEN: process.env.ARTSY_MCP_X_ACCESS_TOKEN,
    ARTSY_MCP_X_USER_ID: process.env.ARTSY_MCP_X_USER_ID,
    GITHUB_ACCESS_TOKEN: process.env.GITHUB_ACCESS_TOKEN,
  };

  const missingVars = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    console.error(
      `\n[agent-cli] Missing required environment variables:\n${missingVars
        .map((v) => `  - ${v}`)
        .join("\n")}\n`
    );
    console.error("Please copy .env.example to .env and fill in the values.\n");
    process.exit(1);
  }
}
