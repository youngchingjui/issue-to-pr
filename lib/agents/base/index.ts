import { LangfuseSpanClient, observeOpenAI } from "langfuse"
import OpenAI from "openai"
import { ChatModel } from "openai/resources"
import {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions"
import {
  ResponseCreateParamsNonStreaming,
  ResponseInput,
  ResponseInputItem,
} from "openai/resources/responses/responses"
import { ZodType } from "zod"

import {
  createErrorEvent,
  createLLMResponseEvent,
  createReasoningEvent,
  createSystemPromptEvent,
  createToolCallEvent,
  createToolCallResultEvent,
  createUserResponseEvent,
  deleteEvent,
} from "@/lib/neo4j/services/event"
import { AgentConstructorParams, AnyEvent, Tool } from "@/lib/types"
import { EnhancedMessage } from "@/lib/types/chat"
import { convertToolToFunctionTool } from "@/lib/utils/chat"

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
  model: ChatModel = "gpt-5"
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
        // Only handle function tool calls; ignore custom tool calls for now
        if (toolCall.type !== "function") {
          // Optional: track that we ignored a custom tool call
          if (this.jobId) {
            await createErrorEvent({
              workflowId: this.jobId,
              content: `Ignoring unsupported custom tool call (id=${toolCall.id})`,
            })
          }
          continue
        }

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

// Custom type that extends OpenAI's FunctionCallOutput with toolName
type ExtendedFunctionCallOutput = ResponseInputItem.FunctionCallOutput & {
  toolName: string
}

// Type guard to check if a message has the toolName property
function hasToolName(
  message: ResponseInputItem
): message is ExtendedFunctionCallOutput {
  return message.type === "function_call_output" && "toolName" in message
}

// Helper function to convert ExtendedFunctionCallOutput to standard FunctionCallOutput
function toStandardFunctionCallOutput(
  extended: ExtendedFunctionCallOutput
): ResponseInputItem.FunctionCallOutput {
  // Extract out toolName so we don't send it back to OpenAI
  const { toolName: _, ...standard } = extended
  return standard
}

/**
 * Agent that uses OpenAI's Responses API instead of the Chat Completions API.
 * We keep message tracking on OpenAI's side using the `previous_response_id` – that
 * means we do **not** maintain a local message history array
 */
export class ResponsesAPIAgent extends Agent {
  inputQueue: ResponseInput = []

  constructor(params: AgentConstructorParams) {
    super(params)
  }
  /**
   * Add developer prompt to the input queue
   */
  async setDeveloperPrompt(prompt: string) {
    await this.addInput({
      type: "message",
      role: "developer",
      content: prompt,
    })
  }

  /**
   * Adds message to the neo4j database
   */
  async trackInput(message: ResponseInputItem) {
    if (!this.jobId) return

    let event: AnyEvent

    switch (message.type) {
      case "message":
        let content: string

        if (typeof message.content !== "string") {
          content = JSON.stringify(message.content)
        } else {
          content = message.content
        }

        switch (message.role) {
          case "system":
          case "developer":
            event = await createSystemPromptEvent({
              workflowId: this.jobId,
              content,
            })
            return event.id

          case "user":
            event = await createUserResponseEvent({
              workflowId: this.jobId,
              content,
            })
            return event.id

          case "assistant":
            event = await createLLMResponseEvent({
              workflowId: this.jobId,
              id: "id" in message && message.id ? message.id : undefined,
              content,
              model: this.model,
            })
            return event.id
        }

      case "function_call":
        event = await createToolCallEvent({
          workflowId: this.jobId,
          toolName: message.name,
          toolCallId: message.call_id,
          args: message.arguments,
        })
        return event.id
      case "function_call_output":
        // Handle both standard OpenAI FunctionCallOutput and our extended version
        const toolName = hasToolName(message) ? message.toolName : "unknown"
        event = await createToolCallResultEvent({
          workflowId: this.jobId,
          toolName,
          toolCallId: message.call_id,
          content: message.output,
          id: "id" in message && message.id ? message.id : undefined,
        })
        return event.id

      case "reasoning":
        for (const summary of message.summary) {
          await createReasoningEvent({
            workflowId: this.jobId,
            summary: summary.text,
          })
        }
        return undefined

      case "web_search_call":
        event = await createToolCallEvent({
          workflowId: this.jobId,
          toolName: "web_search",
          toolCallId: message.id,
          args: JSON.stringify(message),
        })
        return event.id
      default:
        console.log("Message type not tracked yet", message)
        return undefined
    }
  }

  /**
   * Adds input to both the inputQueue and the database
   */
  async addInput(input: ResponseInputItem) {
    if (this.jobId) {
      await this.trackInput(input)
    }

    // If this is an ExtendedFunctionCallOutput, convert to standard for OpenAI
    if (hasToolName(input)) {
      this.inputQueue.push(toStandardFunctionCallOutput(input))
    } else {
      this.inputQueue.push(input)
    }
  }

  /**
   * Custom implementation of runWithFunctions that leverages OpenAI’s
   * Responses API instead of the Chat Completions API. We keep message
   * tracking on OpenAI’s side using the `previous_response_id` – that
   * means we do **not** maintain a local message history array beyond the
   * initial user / system prompts.
   */
  async runWithFunctions(): Promise<{
    jobId?: string
    startTime: Date
    endTime: Date
    messages: EnhancedMessage[]
  }> {
    // Ensure the agent has the required tools before starting
    const hasTools = this.checkTools()
    if (!hasTools) {
      throw new Error("Missing tools, please attach required tools first")
    }

    if (!this.llm) {
      throw new Error("LLM not initialized, please add an API key first")
    }

    const startTime = new Date()

    // Convert internal tools to OpenAI function-tool definition
    const functionTools = this.tools.map((t) => convertToolToFunctionTool(t))

    let previousResponseId: string | undefined
    let reasoningEnabled = true

    const isReasoningVerificationError = (err: unknown) => {
      const obj = (err ?? {}) as Record<string, unknown>
      const msg = typeof obj.message === "string" ? obj.message : ""
      const status = typeof obj.status === "number" ? obj.status : undefined
      const text = msg.toLowerCase()
      return (
        status === 400 &&
        (text.includes("organization must be verified") ||
          text.includes("must be verified to generate reasoning summaries") ||
          text.includes("reasoning summaries"))
      )
    }

    while (true) {
      // Snapshot input so we can safely retry on certain errors
      const inputSnapshot = this.inputQueue.slice()

      const params: ResponseCreateParamsNonStreaming = {
        model: this.model,
        store: true,
        tools: functionTools,
        input: inputSnapshot,
        ...(reasoningEnabled
          ? { reasoning: { summary: "auto" as const } }
          : {}),
      }

      if (previousResponseId) {
        params.previous_response_id = previousResponseId
      }

      try {
        // Make the API call
        const response = await this.llm.responses.create(params)

        // Clear the input queue only after a successful request
        this.inputQueue = []
        previousResponseId = response.id

        let hasFunctionCalls = false

        for (const item of response.output) {
          await this.trackInput(item)
          switch (item.type) {
            case "function_call":
              let toolResponse: ExtendedFunctionCallOutput
              hasFunctionCalls = true

              // Find the tool that the agent called
              const tool = this.tools.find((t) => t.function.name === item.name)

              if (!tool) {
                console.error(`Tool ${item.name} not found`) // Log for debugging
                toolResponse = {
                  type: "function_call_output",
                  call_id: item.call_id,
                  output: `Tool ${item.name} not found`,
                  toolName: item.name,
                }
                await this.addInput(toolResponse)
                continue
              }

              // Validate arguments against the tool schema
              const parsedArgs = JSON.parse(item.arguments)
              const validation = tool.schema.safeParse(parsedArgs)
              if (!validation.success) {
                console.error(
                  `Validation failed for tool ${item.name}: ${validation.error.message}`
                )
                toolResponse = {
                  type: "function_call_output",
                  call_id: item.call_id,
                  output: `Validation failed for tool ${item.name}: ${validation.error.message}`,
                  toolName: tool.function.name,
                }
                await this.addInput(toolResponse)
                continue
              }

              const toolResult = await tool.handler(validation.data)
              const toolResultString =
                typeof toolResult === "string"
                  ? toolResult
                  : JSON.stringify(toolResult)

              toolResponse = {
                type: "function_call_output",
                call_id: item.call_id,
                output: toolResultString,
                toolName: tool.function.name,
              }
              await this.addInput(toolResponse)
              break
            case "code_interpreter_call":
            case "computer_call":
            case "file_search_call":
            case "image_generation_call":
            case "local_shell_call":
            case "mcp_approval_request":
            case "mcp_call":
            case "mcp_list_tools":
            case "message":
            case "reasoning":
            case "web_search_call":
              break
          }
        }

        if (!hasFunctionCalls) {
          // We reached a final assistant response – exit loop
          break
        }
      } catch (err) {
        if (isReasoningVerificationError(err) && reasoningEnabled) {
          reasoningEnabled = false
          // Keep the snapshot in the queue so we retry the same turn without reasoning
          this.inputQueue = inputSnapshot
          if (this.jobId) {
            await createStatusEvent({
              workflowId: this.jobId,
              content:
                "Reasoning summaries are not available for this organization. Continuing without reasoning summaries.",
            })
          }
          // Retry the loop without reasoning
          continue
        }
        // Unknown error – rethrow
        throw err
      }
    }

    return {
      jobId: this.jobId,
      startTime,
      endTime: new Date(),
      messages: [] as EnhancedMessage[],
    }
  }
}
