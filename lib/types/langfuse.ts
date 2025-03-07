import { components } from "langfuse-core"

interface Message {
  role: string
  content: string
}

export interface ToolCall {
  function: {
    name: string
    arguments: string
  }
  id: string
}

export type Observation = components["schemas"]["ObservationsView"] & {
  input?: {
    messages?: Message[]
  }
  output?: {
    content?: string
    tool_calls?: ToolCall[]
  }
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
}

export type TraceWithDetails = components["schemas"]["TraceWithDetails"][]
