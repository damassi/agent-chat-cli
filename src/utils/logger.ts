export const enableLogging = process.env.ENABLE_LOGGING === "true"

export const log = (...messages) => {
  if (enableLogging) {
    console.log("[agent]", ...messages)
  }
}
