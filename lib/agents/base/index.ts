import { LangfuseSpanClient, observeOpenAI } from "langfuse"
import OpenAI from "openai"
import { ChatModel } from "openai/resources"
import {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
} from "openai/resources/chat/completions"
import { z } from "zod"

import {
  createErrorEvent,
  createLLMResponseEvent,
  createSystemPromptEvent,
  createToolCallEvent,
  createToolCallResultEvent,
  createUserResponseEvent,
  deleteEvent,
} from "@/lib/neo4j/services/event"
import WorkflowEventEmitter from "@/lib/services/EventEmitter"
import { WorkflowPersistenceService } from "@/lib/services/WorkflowPersistenceService"
import { AgentConstructorParams, Tool } from "@/lib/types"
import {
  StatusData,
  ToolCallData,
  ToolResponseData,
} from "@/lib/types/workflow"

interface ToolCallInProgress extends ChatCompletionMessageToolCall {
  index: number
}

type EnhancedMessage = ChatCompletionMessageParam & {
  id?: string
  timestamp?: Date
}

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
  tools: Tool<z.ZodType>[] = []
  llm: OpenAI
  model: ChatModel = "gpt-4.1"
  jobId?: string
  private workflowService: WorkflowPersistenceService

  constructor({ model, systemPrompt, apiKey }: AgentConstructorParams) {
    if (model) {
      this.model = model
    }
    if (apiKey) {
      this.addApiKey(apiKey)
    }
    this.workflowService = new WorkflowPersistenceService()
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

  async setSystemPrompt(prompt: string) {
    // Find and remove old system messages from Neo4j if we have a jobId
    if (this.jobId) {
      const oldSystemMessages = this.messages.filter(
        (message) => message.role === "system"
      )
      for (const message of oldSystemMessages) {
        if (message.id) {
          await deleteEvent(message.id)
        }
      }
    }

    // Update messages array
    this.messages = this.messages.filter((message) => message.role !== "system")
    const systemMessage: EnhancedMessage = {
      role: "system",
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

  addTool<T extends z.ZodType>(toolConfig: Tool<T>) {
    this.tools.push(toolConfig)
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
    this.llm = observeOpenAI(this.llm, { parent: span, generationName })
  }

  checkTools() {
    for (const tool of this.REQUIRED_TOOLS) {
      if (!this.tools.some((t) => t.tool.function.name === tool)) {
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

    // Ensure we have at least one user message after system prompt before generating response
    const hasSystemPrompt = this.messages.some((m) => m.role === "system")
    const hasUserMessage = this.messages.some((m) => m.role === "user")

    if (!hasSystemPrompt || !hasUserMessage) {
      throw new Error(
        "Cannot generate response: Need both system prompt and at least one user message"
      )
    }

    const params: ChatCompletionCreateParamsNonStreaming = {
      model: this.model,
      messages: this.messages,
    }

    if (this.tools.length > 0) {
      params.tools = this.tools.map((tool) => tool.tool)
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
          (t) => t.tool.function.name === toolCall.function.name
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

          const validationResult = tool.parameters.safeParse(
            JSON.parse(toolCall.function.arguments)
          )
          if (!validationResult.success) {
            console.error(
              `Validation failed for tool ${toolCall.function.name}: ${validationResult.error.message}`
            )

            // Track error event
            if (this.jobId) {
              await createErrorEvent({
                workflowId: this.jobId,
                content: validationResult.error.message,
              })
            }
            continue
          }

          const toolResponse = await tool.handler(validationResult.data)

          // First track message here, instead of this.trackMessage (inside this.addMessage)
          // Because ChatCompletionMessageParam does not have `toolName` property
          if (this.jobId) {
            await createToolCallResultEvent({
              workflowId: this.jobId,
              toolCallId: toolCall.id,
              toolName: toolCall.function.name,
              content: toolResponse,
            })
          }

          await this.addMessage({
            role: "tool",
            content: toolResponse,
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
      // Only emit status event to mark the end of the agent's execution
      if (this.jobId) {
        await this.workflowService.saveEvent({
          workflowId: this.jobId,
          timestamp: new Date(),
          type: "status",
          data: {
            status: "completed",
            success: true,
          },
        })
      }

      return {
        jobId: this.jobId,
        startTime,
        endTime: new Date(),
        messages: this.messages,
      }
    }
  }

  async runWithFunctionsStream(): Promise<string> {
    const hasTools = this.checkTools()
    if (!hasTools) {
      throw new Error("Missing tools, please attach required tools first")
    }

    const params: ChatCompletionCreateParamsStreaming = {
      model: this.model,
      messages: this.messages, // EnhancedMessage is compatible with ChatCompletionMessageParam
      stream: true,
    }

    if (this.tools.length > 0) {
      params.tools = this.tools.map((tool) => tool.tool)
    }

    const response = await this.llm.chat.completions.create(params)
    let fullContent = ""
    const currentToolCalls: ToolCallInProgress[] = []
    const currentMessage: EnhancedMessage = {
      role: "assistant",
      content: "",
      tool_calls: [],
      timestamp: new Date(),
    }

    for await (const chunk of response) {
      const delta = chunk.choices[0]?.delta

      // Handle content updates
      if (delta?.content) {
        currentMessage.content += delta.content
        fullContent += delta.content

        // If we have a jobId, emit the content update
        if (this.jobId) {
          WorkflowEventEmitter.emit(this.jobId, {
            type: "llm_response",
            data: {
              content: delta.content,
              model: this.model,
            },
            timestamp: new Date(),
          })
        }
      }

      // Handle tool calls
      if (delta?.tool_calls) {
        for (const toolCall of delta.tool_calls) {
          const existingToolCall = currentToolCalls.find(
            (t) => t.index === toolCall.index
          )

          if (existingToolCall) {
            if (toolCall.function?.name) {
              existingToolCall.function.name = toolCall.function.name
            }
            if (toolCall.function?.arguments) {
              existingToolCall.function.arguments += toolCall.function.arguments
            }
          } else {
            currentToolCalls.push({
              id: toolCall.id || "",
              index: toolCall.index || 0,
              type: "function",
              function: {
                name: toolCall.function?.name || "",
                arguments: toolCall.function?.arguments || "",
              },
            })
          }
        }

        // Emit tool call event
        if (this.jobId) {
          WorkflowEventEmitter.emit(this.jobId, {
            type: "tool_call",
            data: {
              toolName: currentToolCalls[0].function.name,
              arguments: JSON.parse(
                currentToolCalls[0].function.arguments || "{}"
              ),
            } as ToolCallData,
            timestamp: new Date(),
          })
        }
      }
    }

    // Update the final message with tool calls if any
    if (currentToolCalls.length > 0) {
      currentMessage.tool_calls = currentToolCalls
    }

    // Add the complete message to our history
    await this.addMessage(currentMessage)

    // Handle tool calls if any
    if (currentToolCalls.length > 0) {
      for (const toolCall of currentToolCalls) {
        const tool = this.tools.find(
          (t) => t.tool.function.name === toolCall.function.name
        )
        if (tool) {
          try {
            const validationResult = tool.parameters.safeParse(
              JSON.parse(toolCall.function.arguments)
            )
            if (validationResult.success) {
              const toolResponse = await tool.handler(validationResult.data)

              if (this.jobId) {
                WorkflowEventEmitter.emit(this.jobId, {
                  type: "tool_response",
                  data: {
                    toolName: toolCall.function.name,
                    response: toolResponse,
                  } as ToolResponseData,
                  timestamp: new Date(),
                })
              }

              await this.addMessage({
                role: "tool",
                content: toolResponse,
                tool_call_id: toolCall.id,
              })
            } else {
              if (this.jobId) {
                await createErrorEvent({
                  workflowId: this.jobId,
                  content: validationResult.error.message,
                })
              }
            }
          } catch (error) {
            if (this.jobId) {
              await createErrorEvent({
                workflowId: this.jobId,
                content: String(error),
              })
            }
          }
        } else {
          console.error(`Tool ${toolCall.function.name} not found`)
        }
      }
      return await this.runWithFunctionsStream()
    }

    // Add the complete message to our history
    await this.addMessage(currentMessage)

    if (this.jobId) {
      WorkflowEventEmitter.emit(this.jobId, {
        type: "status",
        data: { status: "completed", success: true } as StatusData,
        timestamp: new Date(),
      })
    }

    // Add the completion status to our history
    await this.workflowService.saveEvent({
      workflowId: this.jobId,
      timestamp: new Date(),
      type: "status",
      data: {
        status: "completed",
        success: true,
      },
    })

    return fullContent
  }
}
