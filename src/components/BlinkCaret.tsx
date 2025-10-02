import { Text } from "ink"
import { useEffect, useState } from "react"

const BLINK_INTERVAL = 500

interface BlinkCaretProps {
  color?: string
  interval?: number
}

export const BlinkCaret: React.FC<BlinkCaretProps> = ({
  color = "green",
  interval = BLINK_INTERVAL,
}) => {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const refreshInterval = setInterval(() => {
      setVisible((v) => !v)
    }, interval)

    return () => clearInterval(refreshInterval)
  }, [])

  return (
    <Text color={color} dimColor={!visible}>
      ▷{" "}
    </Text>
  )
}
