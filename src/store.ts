import type {
  McpServerConfig,
  PermissionMode,
  SDKResultMessage,
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
  /** A detailed description of the MCP server that the inference agent evaluates */
  description: string
  disallowedTools?: string[]
  enabled?: boolean
  prompt?: () => Promise<string>
}

export interface AgentChatConfig {
  agents?: Record<string, AgentConfig>
  connectionTimeout?: number
  disallowedTools?: string[]
  maxRetries?: number
  mcpServers: Record<string, McpServerConfigWithPrompt>
  model?: "sonnet" | "haiku"
  permissionMode?: PermissionMode
  retryDelay?: number
  stream?: boolean
  systemPrompt?: () => Promise<string>
}

export interface PendingToolPermission {
  input: any
  toolName: string
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
  availableAgents: Computed<StoreModel, string[]>
  availableMcpServers: Computed<StoreModel, string[]>
  isBooted: Computed<StoreModel, boolean>

  // Actions
  abortRequest: Action<StoreModel>
  addChatHistoryEntry: Action<StoreModel, ChatHistoryEntry>
  addToolUse: Action<StoreModel, ToolUse>
  appendCurrentAssistantMessage: Action<StoreModel, string>
  clearCurrentAssistantMessage: Action<StoreModel>
  clearToolUses: Action<StoreModel>
  handleMcpServerStatus: Thunk<StoreModel, McpServerStatus[]>
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
  setStats: Action<StoreModel, SDKResultMessage | null | string>
}

export const AgentStore = createContextStore<StoreModel>({
  abortController: new AbortController(),
  chatHistory: [],
  config: null as unknown as AgentChatConfig,
  currentAssistantMessage: "",
  currentToolUses: [],
  input: "",
  isProcessing: false,
  mcpServers: [],
  messageQueue: new MessageQueue(),
  pendingToolPermission: undefined,
  sessionId: undefined,
  stats: undefined,

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

  setStats: action((state, message) => {
    if (!message) {
      state.stats = null
      return
    }

    if (typeof message === "string") {
      state.stats = message
      return
    }

    state.stats = `Completed in ${(message.duration_ms / 1000).toFixed(2)}s | Cost: $${message.total_cost_usd.toFixed(4)} | Turns: ${message.num_turns}`
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
