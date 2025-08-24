"use server"

import { ChatCompletionMessageParam } from "openai/resources/chat/completions"

import { EvalAgent } from "@/lib/agents/EvalAgent"
import {
  createPlan753EvaluationTool as createPlanEvaluationTool,
  Plan753EvaluationResult as PlanEvaluationResult,
  plan753EvaluationSchema,
} from "@/lib/evals/evalTool"
import { langfuse } from "@/lib/langfuse"
import { getEffectiveOpenAIApiKey } from "@/lib/neo4j/services/openai"

export interface PlanEvaluationResultFull {
  result?: PlanEvaluationResult // the parsed grade/score etc.
  message: ChatCompletionMessageParam // the full response (content, tool_calls, ...)
}

const SYSTEM_PROMPT = `
You are an output evaluation agent. 
Your job is to inspect a coding implementation plan and determine if it avoids several common problems.
You must be very strict in your assessment, and don't pass any of your own biased value judgements. 
If the plan includes any of the elements in the schema, then you must directly say so.

Then, use the tool to output your final assessment scores.`

const planEvaluationTool = createPlanEvaluationTool()

export async function evaluatePlan(
  plan: string,
  context?: {
    repoFullName?: string
    issueNumber?: number
    type?: string
  }
) {
  const apiKey = await getEffectiveOpenAIApiKey()
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
    return { message: response }
  }

  const toolCall = response.tool_calls[0]

  if (toolCall.type !== "function") {
    throw new Error("Tool call should be a function call")
  }

  const toolArgs = plan753EvaluationSchema.parse(
    JSON.parse(toolCall.function.arguments)
  )

  // End the span now that evaluation is complete
  span.end()

  // Return both the parsed result and full message
  return {
    result: toolArgs,
    message: response,
  }
}

