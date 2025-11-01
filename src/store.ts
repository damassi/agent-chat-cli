import type {
  McpServerConfig,
  PermissionMode,
} from "@anthropic-ai/claude-agent-sdk"
import {
  action,
  computed,
  createContextStore,
  thunk,
  type Action,
  type Computed,
  type Thunk,
} from "easy-peasy"
import type { AgentConfig } from "utils/createAgent"
import { getEnabledMcpServers } from "utils/getEnabledMcpServers"
import { MessageQueue } from "utils/MessageQueue"

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

export interface ToolDenied {
  type: "tool_denied"
  name: string
  reason: string
}

export type ChatHistoryEntry = Message | ToolUse | ToolDenied

type McpServerConfigWithPrompt = McpServerConfig & {
  description: string
  prompt?: () => Promise<string>
  disallowedTools?: string[]
  enabled?: boolean
}

export interface AgentChatConfig {
  agents?: Record<string, AgentConfig>
  disallowedTools?: string[]
  connectionTimeout?: number
  maxRetries?: number
  mcpServers: Record<string, McpServerConfigWithPrompt>
  model?: "sonnet" | "haiku"
  permissionMode?: PermissionMode
  retryDelay?: number
  stream?: boolean
  systemPrompt?: () => Promise<string>
}

export interface PendingToolPermission {
  toolName: string
  input: any
}

export interface StoreModel {
  abortController?: AbortController
  chatHistory: ChatHistoryEntry[]
  config: AgentChatConfig
  currentAssistantMessage: string
  currentToolUses: ToolUse[]
  input: string
  isProcessing: boolean
  mcpServers: McpServerStatus[]
  messageQueue: MessageQueue
  pendingToolPermission?: PendingToolPermission
  sessionId?: string
  stats?: string | null

  // Computed
  isBooted: Computed<StoreModel, boolean>
  availableMcpServers: Computed<StoreModel, string[]>
  availableAgents: Computed<StoreModel, string[]>

  // Actions
  abortRequest: Action<StoreModel>
  addChatHistoryEntry: Action<StoreModel, ChatHistoryEntry>
  addToolUse: Action<StoreModel, ToolUse>
  appendCurrentAssistantMessage: Action<StoreModel, string>
  clearCurrentAssistantMessage: Action<StoreModel>
  clearToolUses: Action<StoreModel>
  reset: Action<StoreModel>
  sendMessage: Action<StoreModel, string>
  setPendingToolPermission: Action<
    StoreModel,
    PendingToolPermission | undefined
  >
  setAbortController: Action<StoreModel, AbortController | undefined>
  setConfig: Action<StoreModel, AgentChatConfig>
  setCurrentAssistantMessage: Action<StoreModel, string>
  setCurrentToolUses: Action<StoreModel, ToolUse[]>
  setInput: Action<StoreModel, string>
  setIsProcessing: Action<StoreModel, boolean>
  setMcpServers: Action<StoreModel, McpServerStatus[]>
  setSessionId: Action<StoreModel, string>
  setStats: Action<StoreModel, string | null>
  handleMcpServerStatus: Thunk<StoreModel, McpServerStatus[]>
}

export const AgentStore = createContextStore<StoreModel>({
  abortController: new AbortController(),
  chatHistory: [],
  messageQueue: new MessageQueue(),
  sessionId: undefined,
  mcpServers: [],
  input: "",
  isProcessing: false,
  currentAssistantMessage: "",
  currentToolUses: [],
  pendingToolPermission: undefined,
  stats: undefined,
  config: null as unknown as AgentChatConfig,

  // Computed
  isBooted: computed((state) => {
    return !!state.config
  }),

  availableMcpServers: computed((state) => {
    const enabled = getEnabledMcpServers(state.config?.mcpServers)
    return enabled ? Object.keys(enabled) : []
  }),

  availableAgents: computed((state) => {
    return state.config?.agents ? Object.keys(state.config.agents) : []
  }),

  // Actions
  abortRequest: action((state) => {
    state.abortController?.abort()
    state.abortController = new AbortController()
    state.isProcessing = false
  }),

  addChatHistoryEntry: action((state, payload) => {
    state.chatHistory.push(payload)
  }),

  sendMessage: action((state, payload) => {
    state.isProcessing = true
    state.stats = null
    state.messageQueue.sendMessage(payload)
    state.input = ""
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

  setCurrentAssistantMessage: action((state, payload) => {
    state.currentAssistantMessage = payload
  }),

  appendCurrentAssistantMessage: action((state, payload) => {
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

  clearCurrentAssistantMessage: action((state) => {
    state.currentAssistantMessage = ""
  }),

  clearToolUses: action((state) => {
    state.currentToolUses = []
  }),

  reset: action((state) => {
    state.chatHistory = []
    state.currentAssistantMessage = ""
    state.currentToolUses = []
    state.input = ""
    state.stats = null
  }),

  setConfig: action((state, payload) => {
    state.config = payload
  }),

  setPendingToolPermission: action((state, payload) => {
    state.pendingToolPermission = payload
  }),

  setAbortController: action((state, payload) => {
    state.abortController = payload
  }),

  handleMcpServerStatus: thunk((actions, mcpServers) => {
    actions.setMcpServers(mcpServers)

    if (mcpServers.length === 0) {
      return
    }

    const failedServers = mcpServers
      .filter((s) => s.status === "failed")
      .map((s) => s.name)

    if (failedServers.length > 0) {
      actions.addChatHistoryEntry({
        type: "message",
        role: "system",
        content: `[Error] Failed to connect to ${failedServers.join(", ")}`,
      })
    }
  }),
})
