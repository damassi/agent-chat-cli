import { Box, Text } from "ink"
import { AgentStore } from "../store"

export const Stats: React.FC = () => {
  const stats = AgentStore.useStoreState((state) => state.stats)

  if (!stats) {
    return null
  }

  return (
    <Box marginBottom={1}>
      <Text>{stats}</Text>
    </Box>
  )
}
