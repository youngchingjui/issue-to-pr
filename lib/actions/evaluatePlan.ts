"use server"

import OpenAI from "openai"
import { ChatCompletionMessageParam } from "openai/resources/chat/completions"

import { getUserOpenAIApiKey } from "@/lib/neo4j/services/user"
import {
  PlanEvaluationResult,
  PlanEvaluationSchema,
} from "@/lib/types/evaluation"

const SYSTEM_PROMPT = `You are a code quality evaluation agent. Your job is to inspect a TypeScript implementation plan and determine if it avoids several common problems.
Return only a JSON object matching this TypeScript interface:
{
  noTypeCasting: boolean;    // true if the plan does not use TypeScript type casting like 'as SomeType'
  noAnyTypes: boolean;       // true if the plan does not introduce or use the 'any' type
  noSingleItemHelper: boolean; // true if the plan does not use a conversion helper for just a single item when a built-in method would work
}
If unsure about a criterion, return false for that field.`

export async function evaluatePlan(plan: string): Promise<PlanEvaluationResult> {
  const apiKey = await getUserOpenAIApiKey()
  if (!apiKey) {
    throw new Error("Missing OpenAI API key")
  }

  const openai = new OpenAI({ apiKey })

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: plan },
  ]

  const resp = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages,
    response_format: { type: "json_object" },
  })

  const content = resp.choices[0]?.message?.content || "{}"

  const parsed = PlanEvaluationSchema.safeParse(JSON.parse(content))
  if (!parsed.success) {
    throw new Error(`Invalid evaluation result: ${parsed.error}`)
  }
  return parsed.data
}
