export type AgentRole = "user" | "assistant" | "tool"

export interface AgentMessageBase {
  content?: string
}

export interface ToolCall {
  id: string
  function: { arguments: string; name: string }
  type: "function"
}

export interface UserMessage extends AgentMessageBase {
  role: "user"
  content: string
}

export interface AssistantMessage extends AgentMessageBase {
  role: "assistant"
  content: string
  name?: string
  toolCalls?: ToolCall[]
}

export interface ToolMessage extends AgentMessageBase {
  role: "tool"
  content: string
  /** Name of the tool that produced this message (optional, used by some providers) */
  name?: string
  /** ID linking this tool result back to the originating assistant tool call */
  toolCallId: string
}

export type AgentMessage = UserMessage | AssistantMessage | ToolMessage

export interface ToolDefinition<TArgs = unknown> {
  /** Unique tool name used by the agent and planner */
  name: string
  /** Short description of what the tool does */
  description?: string
  /** Optional JSON schema or free-form structure for arguments */
  schema?: unknown
  /** Optional args type for compile-time consumers */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _argsType?: TArgs extends never ? never : any
}

export interface ToolResult {
  name: string
  /** Free-form string result for the planner/agent to consume */
  output: string
}

/**
 * Port that abstracts tool invocation.
 * Implementations can map tool names to concrete functions, RPCs, etc.
 */
export interface ToolInvokerPort {
  invoke(params: { name: string; args?: unknown }): Promise<ToolResult>
}

export type NextAction =
  | { type: "respond"; content: string }
  | { type: "tool"; name: string; args?: unknown }

/**
 * Port responsible for deciding the next action the agent should take
 * given the current conversation and available tools.
 *
 * Implementations can be LLM-based (function calling or structured output)
 * or rule-based for testing.
 */
export interface AgentPlannerPort {
  planNext(params: {
    system?: string
    developer?: string
    messages: AgentMessage[]
    tools: ToolDefinition[]
  }): Promise<NextAction>
}

export interface AgentPort {
  chatCompletion(params: {
    prompt?: { role: "system" | "developer"; content: string }
    messages: AgentMessage[]
    model?: string
    maxTokens?: number
  }): Promise<string>
}

// TODO: Not sure what AgentPlannerPort is for
// Not sure what NextAction is for
// In fact, most of the stuff in this file doesn't feel right.
