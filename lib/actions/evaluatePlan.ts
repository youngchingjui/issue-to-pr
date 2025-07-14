"use server"

import OpenAI from "openai"
import { zodResponseFormat } from "openai/helpers/zod"
import { ChatCompletionMessageParam } from "openai/resources/chat/completions"
import type { ChatCompletionTool } from "openai/resources/chat/completions/completions"
import { zodToJsonSchema } from "zod-to-json-schema"

import { getUserOpenAIApiKey } from "@/lib/neo4j/services/user"
import {
  PlanEvaluationResult,
  PlanEvaluationSchema,
} from "@/lib/types/evaluation"

const SYSTEM_PROMPT = `You are an output evaluation agent. Your job is to inspect a coding implementation plan and determine if it avoids several common problems.\n\nReturn an evaluation using the provided tool. If unsure about a criterion, return false for that field.`

const planEvaluationTool: ChatCompletionTool = {
  type: "function",
  function: {
    name: "PlanEvaluation",
    description:
      "Return an evaluation of the implementation plan using this schema.",
    parameters: zodToJsonSchema(PlanEvaluationSchema, "PlanEvaluation"),
  },
}

export async function evaluatePlan(
  plan: string
): Promise<PlanEvaluationResult> {
  const apiKey = await getUserOpenAIApiKey()
  if (!apiKey) {
    throw new Error("Missing OpenAI API key")
  }

  const openai = new OpenAI({ apiKey })

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: plan },
  ]

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages,
    tools: [planEvaluationTool],
    tool_choice: "required",
    store: true,
  })

  const toolCall = completion.choices[0]?.message?.tool_calls?.[0]
  if (!toolCall) {
    throw new Error("No tool call result received from OpenAI")
  }
  const result = JSON.parse(toolCall.function.arguments)
  return result
}
