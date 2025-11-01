import { Text } from "ink"
import { useEffect, useState } from "react"

const BLINK_INTERVAL = 500

interface BlinkCaretProps {
  color?: string
  enabled?: boolean
  interval?: number
}

export const BlinkCaret: React.FC<BlinkCaretProps> = ({
  color = "purple",
  enabled = true,
  interval = BLINK_INTERVAL,
}) => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!enabled) return

    const isGhostty = process.env.TERM_PROGRAM === "ghostty"

    if (isGhostty) {
      // Disable blinking in Ghostty to avoid scroll position reset bug
      setVisible(enabled)
      return
    }

    const refreshInterval = setInterval(() => {
      setVisible((v) => !v)
    }, interval)

    return () => clearInterval(refreshInterval)
  }, [enabled])

  return (
    <Text color={color} dimColor={!visible}>
      ▷{" "}
    </Text>
  )
}
