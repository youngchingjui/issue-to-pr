"use server"

import { ChatCompletionMessageParam } from "openai/resources/chat/completions"

import { EvalAgent } from "@/lib/agents/EvalAgent"
import {
  createPlan753EvaluationTool,
  Plan753EvaluationResult,
  plan753EvaluationSchema,
} from "@/lib/evals/plan-753"
import { langfuse } from "@/lib/langfuse"
import { getUserOpenAIApiKey } from "@/lib/neo4j/services/user"

const SYSTEM_PROMPT = `You are an output evaluation agent. Your job is to inspect a coding implementation plan and determine if it avoids several common problems.\n\nReturn an evaluation using the provided tool.`

const planEvaluationTool = createPlan753EvaluationTool()

export async function evaluatePlan(
  plan: string,
  context?: {
    repoFullName?: string
    issueNumber?: number
    type?: string
  }
): Promise<Plan753EvaluationResult> {
  const apiKey = await getUserOpenAIApiKey()
  if (!apiKey) {
    throw new Error("Missing OpenAI API key")
  }

  // Start Langfuse trace for this evaluation
  const trace = langfuse.trace({
    name: "Plan Evaluation",
    input: {
      plan,
      repoFullName: context?.repoFullName,
      issueNumber: context?.issueNumber,
      type: context?.type ?? "plan",
    },
  })
  const span = trace.span({ name: "evaluate_plan" })

  const agent = new EvalAgent({ apiKey, systemPrompt: SYSTEM_PROMPT })
  agent.addTool(planEvaluationTool)

  // Attach Langfuse span so all OpenAI calls are observed
  agent.addSpan({ span, generationName: "evaluate_plan" })

  const messages: ChatCompletionMessageParam[] = [
    { role: "user", content: plan },
  ]

  for (const message of messages) {
    await agent.addMessage(message)
  }

  const { response } = await agent.runOnce()

  // Last message should include tool call
  if (response.role !== "assistant") {
    throw new Error("Response should be an assistant role")
  }

  if (!response.tool_calls) {
    throw new Error("No tool call result received from OpenAI")
  }

  // We should only get 1 tool call, let's discard the rest

  const toolCall = response.tool_calls[0]
  const toolArgs = plan753EvaluationSchema.parse(
    JSON.parse(toolCall.function.arguments)
  )

  // End the span now that evaluation is complete
  span.end()

  return toolArgs
}
