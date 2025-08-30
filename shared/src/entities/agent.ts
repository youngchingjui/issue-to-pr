import type { Message } from "./message"
import type { Tool } from "./tool"

export interface AgentProps {
  id?: string
  name?: string
  systemPrompt?: string
  messages?: Message[]
  tools?: Tool[]
  maxSteps?: number
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
  private _messages: Message[]
  private _tools: Tool[]
  private _maxSteps: number

  constructor({
    id,
    name,
    systemPrompt,
    messages = [],
    tools = [],
    maxSteps = 50,
  }: AgentProps) {
    this._id = id
    this._name = name
    this._systemPrompt = systemPrompt
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

  get messages(): Message[] {
    return [...this._messages]
  }

  get tools(): Tool[] {
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

  addTool(def: Tool): void {
    if (this._tools.find((t) => t.name === def.name)) {
      throw new Error(`Tool already registered: ${def.name}`)
    }
    this._tools.push(def)
  }
}

export default Agent
