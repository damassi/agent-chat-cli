import { useInput } from "ink"
import { useMemo, useState } from "react"
import { AgentStore } from "store"

export const useCycleMessages = () => {
  const store = AgentStore.useStoreState((state) => state)
  const actions = AgentStore.useStoreActions((actions) => actions)

  const userMessages = useMemo(() => {
    return store.chatHistory
      .filter((entry) => entry.type === "message" && entry.role === "user")
      .map((entry) => (entry.type === "message" ? entry.content : ""))
      .reverse()
  }, [store.chatHistory])

  const [cursor, setCursor] = useState(-1)

  useInput((_input, key) => {
    switch (true) {
      case key.upArrow: {
        const next = Math.min(cursor + 1, userMessages.length - 1)
        const message = userMessages[next]

        setCursor(next)

        if (message) {
          actions.setInput(message)
        }
        break
      }

      case key.downArrow: {
        const next = Math.max(cursor - 1, -1)

        setCursor(next)

        if (next === -1) {
          actions.setInput("")
        } else {
          const message = userMessages[next]

          if (message) {
            actions.setInput(message)
          }
        }
        break
      }
    }
  })

  return {
    reset: () => setCursor(-1),
  }
}
