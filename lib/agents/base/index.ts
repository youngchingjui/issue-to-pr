import { LangfuseSpanClient, observeOpenAI } from "langfuse"
import OpenAI from "openai"
import { ChatModel } from "openai/resources"
import {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions"
import { z } from "zod"

import { Tool } from "@/lib/types"

export class Agent {
  prompt: string
  messages: ChatCompletionMessageParam[] = []
  tools: Tool<z.ZodType>[] = []
  llm: OpenAI
  model: ChatModel = "gpt-4o"

  constructor({
    model,
    systemPrompt,
    apiKey,
  }: {
    model?: ChatModel
    systemPrompt?: string
    apiKey?: string
  }) {
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

  async runWithFunctions() {
    const params: ChatCompletionCreateParamsNonStreaming = {
      model: this.model,
      messages: this.messages,
    }

    if (this.tools.length > 0) {
      params.tools = this.tools.map((tool) => tool.tool)
    }

    const response = await this.llm.chat.completions.create(params)

    if (response.choices[0].message.tool_calls) {
      for (const toolCall of response.choices[0].message.tool_calls) {
        const tool = this.tools.find(
          (t) => t.tool.__name === toolCall.function.name
        )
        if (tool) {
          const toolResponse = await tool.handler(toolCall.function.arguments)
          this.addMessage({
            role: "tool",
            content: toolResponse,
            tool_call_id: toolCall.id,
          })
        }
      }
      this.runWithFunctions()
    } else {
      return response.choices[0].message.content
    }
  }
}
