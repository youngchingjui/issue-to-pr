import type { CoreWorkflowEvent, EventPort } from "@shared/ports/events"
import type { LLMPort } from "@shared/ports/llm"

export interface AgentToolContext {
  emit: (event: CoreWorkflowEvent) => Promise<void> | void
}

export interface AgentTool<Args = unknown, Result = unknown> {
  name: string
  description: string
  execute: (args: Args, ctx: AgentToolContext) => Promise<Result>
}

export interface AgentConfig {
  id: string
  systemPrompt: string
  tools: AgentTool[]
}

export class Agent {
  private readonly id: string
  private readonly systemPrompt: string
  private readonly tools: Map<string, AgentTool>
  private readonly llm: LLMPort
  private readonly events: EventPort
  private readonly workflowId: string

  constructor(params: {
    config: AgentConfig
    llm: LLMPort
    events: EventPort
    workflowId: string
  }) {
    this.id = params.config.id
    this.systemPrompt = params.config.systemPrompt
    this.tools = new Map(params.config.tools.map((t) => [t.name, t]))
    this.llm = params.llm
    this.events = params.events
    this.workflowId = params.workflowId
  }

  async start(): Promise<void> {
    await this.events.emit(this.workflowId, {
      type: "system_prompt",
      data: { content: this.systemPrompt },
      timestamp: new Date(),
    })
  }

  async emit(event: CoreWorkflowEvent): Promise<void> {
    await this.events.emit(this.workflowId, event)
  }

  getTool(name: string): AgentTool | undefined {
    return this.tools.get(name)
  }

  async respondToUser(content: string): Promise<string> {
    const response = await this.llm.createCompletion({
      system: this.systemPrompt,
      messages: [{ role: "user", content }],
    })

    await this.events.emit(this.workflowId, {
      type: "user_message",
      data: { content },
      timestamp: new Date(),
    })

    await this.events.emit(this.workflowId, {
      type: "llm_response",
      data: { content: response },
      timestamp: new Date(),
    })

    return response
  }
}
