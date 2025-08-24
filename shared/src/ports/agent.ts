export type AgentRole = "user" | "assistant" | "tool"

export interface AgentMessageBase {
  content: string
}

export interface UserMessage extends AgentMessageBase {
  role: "user"
}

export interface AssistantMessage extends AgentMessageBase {
  role: "assistant"
}

export interface ToolMessage extends AgentMessageBase {
  role: "tool"
  /** Name of the tool that produced this message */
  name: string
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
