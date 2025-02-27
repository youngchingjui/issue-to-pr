import { LangfuseSpanClient, observeOpenAI } from "langfuse"
import OpenAI from "openai"
import {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions"
import { z } from "zod"

import { updateJobStatus } from "@/lib/redis-old"
import { AgentConstructorParams, Tool } from "@/lib/types"

export class Agent {
  REQUIRED_TOOLS: string[] = []
  tools: Tool<z.ZodType>[] = []
  llm: OpenAI
  jobId?: string
  params: ChatCompletionCreateParamsNonStreaming

  constructor({
    model,
    systemPrompt,
    apiKey,
    ...rest
  }: AgentConstructorParams) {
    this.params = { messages: [], model: model || "gpt-4o", ...rest }
    if (systemPrompt) {
      this.setSystemPrompt(systemPrompt)
    }
    if (apiKey) {
      this.addApiKey(apiKey)
    }
  }

  setSystemPrompt(prompt: string) {
    // Updates the system prompt for the agent
    this.params.messages = this.params.messages.filter(
      (message) => message.role !== "system"
    )
    this.params.messages.unshift({
      role: "system",
      content: prompt,
    })
  }

  addMessage(message: ChatCompletionMessageParam) {
    this.params.messages.push(message)
  }

  getMessages() {
    return this.params.messages
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

    if (this.tools.length > 0) {
      this.params.tools = this.tools.map((tool) => tool.tool)
    }

    const response = await this.llm.chat.completions.create(this.params)
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
}
