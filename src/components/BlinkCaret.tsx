import { Text } from "ink"
import { useEffect, useState } from "react"

const BLINK_INTERVAL = 500

interface BlinkCaretProps {
  color?: string
  enabled?: boolean
  interval?: number
}

export const BlinkCaret: React.FC<BlinkCaretProps> = ({
  color = "green",
  enabled = false,
  interval = BLINK_INTERVAL,
}) => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!enabled) return

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
