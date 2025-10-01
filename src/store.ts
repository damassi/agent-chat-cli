import type { McpServerConfig } from "@anthropic-ai/claude-agent-sdk"
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

type McpServerConfigWithPrompt = McpServerConfig & {
  prompt?: string
}

export interface AgentChatConfig {
  mcpServers: Record<string, McpServerConfigWithPrompt>
}

export interface StoreModel {
  chatHistory: TimelineEntry[]
  config: AgentChatConfig | null
  currentAssistantMessage: string
  currentToolUses: ToolUse[]
  input: string
  isProcessing: boolean
  mcpServers: McpServerStatus[]
  messageQueue: { resolve: (value: string) => void }[]
  sessionId?: string
  shouldExit: boolean
  stats?: string | null

  // Computed
  isBooted: Computed<StoreModel, boolean>

  // Actions
  addChatHistoryEntry: Action<StoreModel, TimelineEntry>
  addToolUse: Action<StoreModel, ToolUse>
  appendcurrentAssistantMessage: Action<StoreModel, string>
  clearCurrentAssistantMessage: Action<StoreModel>
  clearToolUses: Action<StoreModel>
  setConfig: Action<StoreModel, AgentChatConfig>
  setcurrentAssistantMessage: Action<StoreModel, string>
  setCurrentToolUses: Action<StoreModel, ToolUse[]>
  setInput: Action<StoreModel, string>
  setIsProcessing: Action<StoreModel, boolean>
  setMcpServers: Action<StoreModel, McpServerStatus[]>
  setSessionId: Action<StoreModel, string>
  setShouldExit: Action<StoreModel, boolean>
  setStats: Action<StoreModel, string | null>
}

export const AgentStore = createContextStore<StoreModel>({
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
  config: null,

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

  clearCurrentAssistantMessage: action((state) => {
    state.currentAssistantMessage = ""
  }),

  clearToolUses: action((state) => {
    state.currentToolUses = []
  }),

  setConfig: action((state, payload) => {
    state.config = payload
  }),
})
