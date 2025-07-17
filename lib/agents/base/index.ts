import { LangfuseSpanClient, observeOpenAI } from "langfuse"
import OpenAI from "openai"
import { ChatModel } from "openai/resources"
import {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions"
import { ZodType } from "zod"

import {
  createErrorEvent,
  createLLMResponseEvent,
  createSystemPromptEvent,
  createToolCallEvent,
  createToolCallResultEvent,
  createUserResponseEvent,
  deleteEvent,
} from "@/lib/neo4j/services/event"
import { AgentConstructorParams, Tool } from "@/lib/types"
import { EnhancedMessage } from "@/lib/types/chat"

interface RunResponse {
  jobId?: string
  startTime: Date
  endTime: Date
  messages: EnhancedMessage[]
}

export class Agent {
  REQUIRED_TOOLS: string[] = []
  messages: EnhancedMessage[] = []
  private untrackedMessages: EnhancedMessage[] = [] // Queue for untracked messages
  tools: Tool<ZodType, unknown>[] = []
  llm: OpenAI | null = null
  model: ChatModel = "o3"
  jobId?: string

  constructor({ model, systemPrompt, apiKey }: AgentConstructorParams) {
    if (model) {
      this.model = model
    }
    if (apiKey) {
      this.addApiKey(apiKey)
    }
    if (systemPrompt) {
      this.setSystemPrompt(systemPrompt)
    }
  }

  private async trackMessage(
    message: ChatCompletionMessageParam
  ): Promise<string | undefined> {
    if (!this.jobId) return

    let eventId: string | undefined

    if (message.role === "system" && typeof message.content === "string") {
      const event = await createSystemPromptEvent({
        workflowId: this.jobId,
        content: message.content,
      })
      eventId = event.id
    } else if (message.role === "user" && typeof message.content === "string") {
      const event = await createUserResponseEvent({
        workflowId: this.jobId,
        content: message.content,
      })
      eventId = event.id
    } else if (
      message.role === "assistant" &&
      typeof message.content === "string"
    ) {
      const event = await createLLMResponseEvent({
        workflowId: this.jobId,
        content: message.content,
        model: this.model,
      })
      eventId = event.id
    }

    return eventId
  }

  async addJobId(jobId: string) {
    this.jobId = jobId

    // Process any queued messages
    for (const message of this.untrackedMessages) {
      await this.trackMessage(message)
    }
    this.untrackedMessages = [] // Clear the queue
  }

  async setSystemPrompt(
    prompt: string,
    role: "system" | "developer" = "system"
  ) {
    // Find and remove old prompt messages (system or developer) from Neo4j if we have a jobId
    if (this.jobId) {
      const oldPromptMessages = this.messages.filter(
        (message) => message.role === "system" || message.role === "developer"
      )
      for (const message of oldPromptMessages) {
        if (message.id) {
          await deleteEvent(message.id)
        }
      }
    }

    // Update messages array
    this.messages = this.messages.filter(
      (message) => message.role !== "system" && message.role !== "developer"
    )
    const systemMessage: EnhancedMessage = {
      role,
      content: prompt,
    }
    this.messages.unshift(systemMessage)

    // Track the message
    if (this.jobId) {
      await this.trackMessage(systemMessage)
    } else {
      this.untrackedMessages.push(systemMessage)
    }
  }

  // Alias for setSystemPrompt – provides the same behavior under a developer-centric name
  async setDeveloperPrompt(prompt: string) {
    // Simply delegate to setSystemPrompt so we keep a single implementation.
    return this.setSystemPrompt(prompt, "developer")
  }

  async addMessage(message: ChatCompletionMessageParam) {
    const enhancedMessage: EnhancedMessage = {
      ...message,
      timestamp: new Date(),
    }

    if (this.jobId) {
      enhancedMessage.id = await this.trackMessage(message)
    }

    this.messages.push(enhancedMessage)
  }

  // Best I could do to avoid type errors
  addTool<ToolSchema extends ZodType, ToolOutput>(
    tool: Tool<ToolSchema, ToolOutput>
  ) {
    this.tools.push(tool as unknown as Tool<ZodType, unknown>)
  }

  addApiKey(apiKey: string) {
    this.llm = new OpenAI({ apiKey })
  }

  addSpan({
    span,
    generationName,
  }: {
    span: LangfuseSpanClient
    generationName: string
  }) {
    if (!this.llm) {
      throw new Error("LLM not initialized, please add an API key first")
    }
    this.llm = observeOpenAI(this.llm, { parent: span, generationName })
  }

  checkTools() {
    for (const tool of this.REQUIRED_TOOLS) {
      if (!this.tools.some((t) => t.function.name === tool)) {
        console.error(`Agent does not have the ${tool} tool`)
        return false
      }
    }
    return true
  }

  async runWithFunctions(): Promise<RunResponse> {
    const startTime = new Date()
    const hasTools = this.checkTools()
    if (!hasTools) {
      throw new Error("Missing tools, please attach required tools first")
    }

    // Ensure we have at least one user message after a prompt (system or developer) before generating response
    const hasPrompt = this.messages.some(
      (m) => m.role === "system" || m.role === "developer"
    )
    const hasUserMessage = this.messages.some((m) => m.role === "user")

    if (!hasPrompt || !hasUserMessage) {
      throw new Error(
        "Cannot generate response: Need both an initial prompt (system or developer) and at least one user message"
      )
    }

    if (!this.llm) {
      throw new Error("LLM not initialized, please add an API key first")
    }

    const params: ChatCompletionCreateParamsNonStreaming = {
      model: this.model,
      messages: this.messages,
      store: true,
    }

    if (this.tools.length > 0) {
      params.tools = this.tools
    }
    const response = await this.llm.chat.completions.create(params)
    console.log(
      `[DEBUG] response: ${JSON.stringify(response.choices[0].message)}`
    )

    // Add and track the assistant's response
    await this.addMessage(response.choices[0].message)

    if (response.choices[0].message.tool_calls) {
      for (const toolCall of response.choices[0].message.tool_calls) {
        const tool = this.tools.find(
          (t) => t.function.name === toolCall.function.name
        )
        if (tool) {
          // Track tool call event
          if (this.jobId) {
            await createToolCallEvent({
              workflowId: this.jobId,
              toolName: toolCall.function.name,
              toolCallId: toolCall.id,
              args: toolCall.function.arguments,
            })
          }

          const validationResult = tool.schema.safeParse(
            JSON.parse(toolCall.function.arguments)
          )
          if (!validationResult.success) {
            const errorContent = `Validation failed for tool ${toolCall.function.name}: ${validationResult.error.message}`
            console.error(errorContent)

            // Track error event
            if (this.jobId) {
              await createToolCallResultEvent({
                workflowId: this.jobId,
                toolCallId: toolCall.id,
                toolName: toolCall.function.name,
                content: errorContent,
              })
            }

            // Surface the validation error back to the LLM through a tool response
            await this.addMessage({
              role: "tool",
              content: errorContent,
              tool_call_id: toolCall.id,
            })
            continue
          }

          const toolResponse = await tool.handler(validationResult.data)

          let toolResponseString: string
          if (typeof toolResponse !== "string") {
            toolResponseString = JSON.stringify(toolResponse)
          } else {
            toolResponseString = toolResponse
          }

          // First track message here, instead of this.trackMessage (inside this.addMessage)
          // Because ChatCompletionMessageParam does not have `toolName` property
          if (this.jobId) {
            await createToolCallResultEvent({
              workflowId: this.jobId,
              toolCallId: toolCall.id,
              toolName: toolCall.function.name,
              content: toolResponseString,
            })
          }

          await this.addMessage({
            role: "tool",
            content: toolResponseString,
            tool_call_id: toolCall.id,
          })
        } else {
          console.error(`Tool ${toolCall.function.name} not found`)
          // Track error event
          if (this.jobId) {
            await createErrorEvent({
              workflowId: this.jobId,
              content: `Tool ${toolCall.function.name} not found`,
            })
          }
        }
      }
      return await this.runWithFunctions()
    } else {
      return {
        jobId: this.jobId,
        startTime,
        endTime: new Date(),
        messages: this.messages,
      }
    }
  }

  async runOnce(): Promise<
    RunResponse & { response: ChatCompletionMessageParam }
  > {
    const startTime = new Date()

    // Ensure we have at least one user message after a prompt (system or developer) before generating response
    const hasPrompt = this.messages.some(
      (m) => m.role === "system" || m.role === "developer"
    )
    const hasUserMessage = this.messages.some((m) => m.role === "user")

    if (!hasPrompt || !hasUserMessage) {
      throw new Error(
        "Cannot generate response: Need both an initial prompt (system or developer) and at least one user message"
      )
    }

    if (!this.llm) {
      throw new Error("LLM not initialized, please add an API key first")
    }

    const params: ChatCompletionCreateParamsNonStreaming = {
      model: this.model,
      messages: this.messages,
      store: true,
    }

    if (this.tools.length > 0) {
      params.tools = this.tools
    }

    const response = await this.llm.chat.completions.create(params)

    // Add and track the assistant's response
    await this.addMessage(response.choices[0].message)

    return {
      jobId: this.jobId,
      startTime,
      endTime: new Date(),
      messages: this.messages,
      response: response.choices[0].message,
    }
  }
}
