import {
  action,
  computed,
  createContextStore,
  type Action,
  type Computed,
} from "easy-peasy"

export interface Message {
  type: "message"
  role: "user" | "assistant" | "system"
  content: string
}

export interface McpServerStatus {
  name: string
  status: string
}

export interface ToolUse {
  type: "tool_use"
  name: string
  input: Record<string, unknown>
}

export type TimelineEntry = Message | ToolUse

export interface StoreModel {
  // State
  chatHistory: TimelineEntry[]
  messageQueue: { resolve: (value: string) => void }[]
  sessionId?: string
  mcpServers: McpServerStatus[]
  input: string
  isProcessing: boolean
  currentAssistantMessage: string
  currentToolUses: ToolUse[]
  stats?: string | null
  shouldExit: boolean

  // Computed
  isBooted: Computed<StoreModel, boolean>

  // Actions
  addChatHistoryEntry: Action<StoreModel, TimelineEntry>
  setSessionId: Action<StoreModel, string>
  setMcpServers: Action<StoreModel, McpServerStatus[]>
  setInput: Action<StoreModel, string>
  setIsProcessing: Action<StoreModel, boolean>
  setcurrentAssistantMessage: Action<StoreModel, string>
  appendcurrentAssistantMessage: Action<StoreModel, string>
  setCurrentToolUses: Action<StoreModel, ToolUse[]>
  addToolUse: Action<StoreModel, ToolUse>
  setStats: Action<StoreModel, string | null>
  setShouldExit: Action<StoreModel, boolean>
  clearcurrentAssistantMessage: Action<StoreModel>
  clearToolUses: Action<StoreModel>
}

export const AgentStore = createContextStore<StoreModel>({
  // Initial state
  chatHistory: [],
  messageQueue: [],
  sessionId: undefined,
  mcpServers: [],
  input: "",
  isProcessing: false,
  currentAssistantMessage: "",
  currentToolUses: [],
  stats: undefined,
  shouldExit: false,

  // Computed
  isBooted: computed((state) => !!state.sessionId),

  // Actions
  addChatHistoryEntry: action((state, payload) => {
    state.chatHistory.push(payload)
  }),

  setSessionId: action((state, payload) => {
    state.sessionId = payload
  }),

  setMcpServers: action((state, payload) => {
    state.mcpServers = payload
  }),

  setInput: action((state, payload) => {
    state.input = payload
  }),

  setIsProcessing: action((state, payload) => {
    state.isProcessing = payload
  }),

  setcurrentAssistantMessage: action((state, payload) => {
    state.currentAssistantMessage = payload
  }),

  appendcurrentAssistantMessage: action((state, payload) => {
    state.currentAssistantMessage += payload
  }),

  setCurrentToolUses: action((state, payload) => {
    state.currentToolUses = payload
  }),

  addToolUse: action((state, payload) => {
    state.currentToolUses.push(payload)
  }),

  setStats: action((state, payload) => {
    state.stats = payload
  }),

  setShouldExit: action((state, payload) => {
    state.shouldExit = payload
  }),

  clearcurrentAssistantMessage: action((state) => {
    state.currentAssistantMessage = ""
  }),

  clearToolUses: action((state) => {
    state.currentToolUses = []
  }),
})
