import type { LLMMessage, LLMPort } from "@/shared/src/core/ports/llm"
import type {
  AgentMessage,
  AgentPlannerPort,
  NextAction,
  ToolDefinition,
  ToolInvokerPort,
  ToolMessage,
} from "@/shared/src/core/ports/agent"

export interface AgentProps {
  id?: string
  name?: string
  systemPrompt?: string
  developerPrompt?: string
  messages?: AgentMessage[]
  tools?: ToolDefinition[]
  maxSteps?: number
}

export interface AgentRunResult {
  steps: number
  final?: { role: "assistant"; content: string }
  /**
   * If the loop exited due to reaching max steps, this flag is true.
   */
  reachedMaxSteps?: boolean
}

/**
 * Core Agent entity.
 *
 * - Maintains prompts and conversation history
 * - Can perform a one-off completion using an LLM port
 * - Can run a tool-using loop guided by a planner port and a tool invoker port
 *
 * This entity is framework-agnostic and contains only domain logic/state.
 */
export class Agent {
  private _id?: string
  private _name?: string
  private _systemPrompt?: string
  private _developerPrompt?: string
  private _messages: AgentMessage[]
  private _tools: ToolDefinition[]
  private _maxSteps: number

  constructor({
    id,
    name,
    systemPrompt,
    developerPrompt,
    messages = [],
    tools = [],
    maxSteps = 8,
  }: AgentProps) {
    this._id = id
    this._name = name
    this._systemPrompt = systemPrompt
    this._developerPrompt = developerPrompt
    this._messages = [...messages]
    this._tools = [...tools]
    this._maxSteps = maxSteps
  }

  get id(): string | undefined {
    return this._id
  }

  get name(): string | undefined {
    return this._name
  }

  get systemPrompt(): string | undefined {
    return this._systemPrompt
  }

  get developerPrompt(): string | undefined {
    return this._developerPrompt
  }

  get messages(): AgentMessage[] {
    return [...this._messages]
  }

  get tools(): ToolDefinition[] {
    return [...this._tools]
  }

  set maxSteps(value: number) {
    if (value <= 0) throw new Error("maxSteps must be > 0")
    this._maxSteps = value
  }

  get maxSteps(): number {
    return this._maxSteps
  }

  addUserMessage(content: string): void {
    this._messages.push({ role: "user", content })
  }

  addAssistantMessage(content: string): void {
    this._messages.push({ role: "assistant", content })
  }

  addToolMessage(name: string, content: string): void {
    const msg: ToolMessage = { role: "tool", name, content }
    this._messages.push(msg)
  }

  registerTool(def: ToolDefinition): void {
    if (this._tools.find((t) => t.name === def.name)) {
      throw new Error(`Tool already registered: ${def.name}`)
    }
    this._tools.push(def)
  }

  /**
   * Map current conversation into the minimal LLM format.
   * Tool messages are folded into assistant text to keep the LLM port simple.
   */
  private toLLMMessages(): { system?: string; messages: LLMMessage[] } {
    const systemParts: string[] = []
    if (this._systemPrompt) systemParts.push(this._systemPrompt)
    if (this._developerPrompt)
      systemParts.push(`Developer instructions:\n${this._developerPrompt}`)

    const messages: LLMMessage[] = this._messages.map((m) => {
      if (m.role === "tool") {
        // Represent tool output as assistant text that the LLM can read.
        return {
          role: "assistant",
          content: `[Tool ${m.name} result]:\n${m.content}`,
        }
      }
      // user or assistant map 1:1
      return { role: m.role, content: m.content }
    })

    return {
      system: systemParts.length ? systemParts.join("\n\n") : undefined,
      messages,
    }
  }

  /**
   * Perform a single completion using the provided LLM port.
   */
  async completeOnce(llm: LLMPort, params?: { model?: string; maxTokens?: number }): Promise<string> {
    const { system, messages } = this.toLLMMessages()
    const content = await llm.createCompletion({
      system,
      messages,
      model: params?.model,
      maxTokens: params?.maxTokens,
    })
    this.addAssistantMessage(content)
    return content
  }

  /**
   * Run a tool-using loop governed by a planner and tool invoker.
   * The loop ends when the planner returns a "respond" action or when maxSteps is reached.
   */
  async run(planner: AgentPlannerPort, tools: ToolInvokerPort): Promise<AgentRunResult> {
    let steps = 0

    while (steps < this._maxSteps) {
      steps += 1
      const action: NextAction = await planner.planNext({
        system: this._systemPrompt,
        developer: this._developerPrompt,
        messages: this._messages,
        tools: this._tools,
      })

      if (action.type === "respond") {
        this.addAssistantMessage(action.content)
        return { steps, final: { role: "assistant", content: action.content } }
      }

      // Tool action
      const res = await tools.invoke({ name: action.name, args: action.args })
      this.addToolMessage(res.name, res.output)
    }

    return { steps: this._maxSteps, reachedMaxSteps: true }
  }
}

export default Agent

