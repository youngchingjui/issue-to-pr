import { LangfuseSpanClient, observeOpenAI } from "langfuse"
import OpenAI from "openai"
import { ChatModel } from "openai/resources"
import {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
  ChatCompletionToolMessageParam,
} from "openai/resources/chat/completions"
import { z } from "zod"

import { updateJobStatus } from "@/lib/redis-old"
import { LLMOutput, WorkflowEmitter } from "@/lib/services/WorkflowEmitter"
import { AgentConstructorParams, Tool } from "@/lib/types"

interface ToolCallInProgress extends ChatCompletionMessageToolCall {
  index: number
}

export class Agent {
  REQUIRED_TOOLS: string[] = []
  prompt: string
  messages: ChatCompletionMessageParam[] = []
  tools: Tool<z.ZodType>[] = []
  llm: OpenAI
  model: ChatModel = "gpt-4o"
  jobId?: string

  constructor({ model, systemPrompt, apiKey }: AgentConstructorParams) {
    if (model) {
      this.model = model
    }
    if (systemPrompt) {
      this.setSystemPrompt(systemPrompt)
    }
    if (apiKey) {
      this.addApiKey(apiKey)
    }
  }

  setSystemPrompt(prompt: string) {
    // Adds system prompt to the agent
    // then updates system prompt within the message list

    this.prompt = prompt
    this.messages = this.messages.filter((message) => message.role !== "system")
    this.messages.unshift({
      role: "system",
      content: prompt,
    })
  }

  addMessage(message: ChatCompletionMessageParam) {
    this.messages.push(message)
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

  addJobId(jobId: string) {
    this.jobId = jobId
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

  async runWithFunctions(): Promise<string> {
    const hasTools = this.checkTools()
    if (!hasTools) {
      throw new Error("Missing tools, please attach required tools first")
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

    if (this.jobId) {
      await updateJobStatus(
        this.jobId,
        JSON.stringify(response.choices[0].message)
      )
    }

    this.addMessage(response.choices[0].message)

    if (response.choices[0].message.tool_calls) {
      for (const toolCall of response.choices[0].message.tool_calls) {
        const tool = this.tools.find(
          (t) => t.tool.function.name === toolCall.function.name
        )
        if (tool) {
          const validationResult = tool.parameters.safeParse(
            JSON.parse(toolCall.function.arguments)
          )
          if (!validationResult.success) {
            console.error(
              `Validation failed for tool ${toolCall.function.name}: ${validationResult.error.message}`
            )
            continue
          }
          const toolResponse = await tool.handler(validationResult.data)
          this.addMessage({
            role: "tool",
            content: toolResponse,
            tool_call_id: toolCall.id,
          })
        } else {
          console.error(`Tool ${toolCall.function.name} not found`)
        }
      }
      return await this.runWithFunctions()
    } else {
      return response.choices[0].message.content
    }
  }

  async runWithFunctionsStream(): Promise<string> {
    const hasTools = this.checkTools()
    if (!hasTools) {
      throw new Error("Missing tools, please attach required tools first")
    }

    const params: ChatCompletionCreateParamsStreaming = {
      model: this.model,
      messages: this.messages,
      stream: true,
    }

    if (this.tools.length > 0) {
      params.tools = this.tools.map((tool) => tool.tool)
    }

    const response = await this.llm.chat.completions.create(params)
    let fullContent = ""
    const currentToolCalls: ToolCallInProgress[] = []
    const currentMessage = {
      role: "assistant" as const,
      content: "",
      tool_calls: [],
    }

    for await (const chunk of response) {
      const delta = chunk.choices[0]?.delta

      // Handle content updates
      if (delta?.content) {
        currentMessage.content += delta.content
        fullContent += delta.content

        // If we have a jobId, emit the content update
        if (this.jobId) {
          const llmOutput: LLMOutput = {
            content: delta.content,
            timestamp: new Date(),
          }
          await WorkflowEmitter.setStageMetadata(this.jobId, "analysis", {
            metadata: {
              llm_output: llmOutput,
            },
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
      }
    }

    // Update the final message with tool calls if any
    if (currentToolCalls.length > 0) {
      currentMessage.tool_calls = currentToolCalls
    }

    // Add the complete message to our history
    this.addMessage(currentMessage)

    // Handle tool calls if any
    if (currentToolCalls.length > 0) {
      for (const toolCall of currentToolCalls) {
        const tool = this.tools.find(
          (t) => t.tool.function.name === toolCall.function.name
        )
        if (tool) {
          const validationResult = tool.parameters.safeParse(
            JSON.parse(toolCall.function.arguments)
          )
          if (!validationResult.success) {
            console.error(
              `Validation failed for tool ${toolCall.function.name}: ${validationResult.error.message}`
            )
            continue
          }
          const toolResponse = await tool.handler(validationResult.data)
          this.addMessage({
            role: "tool",
            content: toolResponse,
            tool_call_id: toolCall.id,
          })
        } else {
          console.error(`Tool ${toolCall.function.name} not found`)
        }
      }
      return await this.runWithFunctionsStream()
    }

    return currentMessage.content
  }
}
