"use server"

import { ChatCompletionMessageParam } from "openai/resources/chat/completions"

import { getUserOpenAIApiKey } from "@/lib/neo4j/services/user"
import { TestAgent } from "@/lib/agents/testAgent"
import {
  createPlan753EvaluationTool,
  Plan753EvaluationResult,
} from "@/lib/evals/plan-753"

const SYSTEM_PROMPT = `You are an output evaluation agent. Your job is to inspect a coding implementation plan and determine if it avoids several common problems.\n\nReturn an evaluation using the provided tool. If unsure about a criterion, return false for that field.`

const planEvaluationTool = createPlan753EvaluationTool()

export async function evaluatePlan(
  plan: string
): Promise<Plan753EvaluationResult> {
  const apiKey = await getUserOpenAIApiKey()
  if (!apiKey) {
    throw new Error("Missing OpenAI API key")
  }

  const agent = new TestAgent({ apiKey, systemPrompt: SYSTEM_PROMPT })
  agent.addTool(planEvaluationTool)

  const messages: ChatCompletionMessageParam[] = [
    { role: "user", content: plan },
  ]

  for (const message of messages) {
    await agent.addMessage(message)
  }

  const { messages: finalMessages } = await agent.runWithFunctions()

  const toolMessage = [...finalMessages].reverse().find((m) => m.role === "tool")
  if (!toolMessage || typeof toolMessage.content !== "string") {
    throw new Error("No tool call result received from OpenAI")
  }

  return JSON.parse(toolMessage.content) as Plan753EvaluationResult
}
