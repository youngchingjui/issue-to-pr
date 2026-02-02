import type { Tool } from "@shared/entities/Tool"
import { type ZodType } from "zod"

export interface AgentConfig {
  id: string
  systemPrompt: string
  developerPrompt?: string
  tools: Tool<ZodType, unknown>[]
}

export class Agent {
  private readonly id: string
  private readonly systemPrompt: string
  private readonly developerPrompt: string // Same as systemPrompt
  private readonly tools: Tool<ZodType, unknown>[]
  private readonly workflowId: string

  constructor(params: { config: AgentConfig; workflowId: string }) {
    this.id = params.config.id
    this.systemPrompt = params.config.systemPrompt
    this.developerPrompt = params.config.developerPrompt ?? this.systemPrompt
    this.tools = params.config.tools
    this.workflowId = params.workflowId
  }
}
