import { DateTime, Integer } from "neo4j-driver"
import { z } from "zod"

import {
  ErrorEvent,
  errorEventSchema,
  Issue,
  issueSchema,
  llmResponseSchema as appLLMResponseSchema,
  planSchema as appPlanSchema,
  ReviewComment,
  reviewCommentSchema,
  StatusEvent,
  statusEventSchema,
  SystemPrompt,
  systemPromptSchema,
  ToolCall,
  ToolCallResult,
  toolCallResultSchema,
  toolCallSchema,
  UserMessage,
  userMessageSchema,
  workflowRunSchema as appWorkflowRunSchema,
  WorkflowState,
  workflowStateSchema,
  WorkflowType,
  workflowTypeEnum,
} from "@/lib/types"

// Re-export for Neo4j DB layer
export {
  errorEventSchema,
  issueSchema,
  reviewCommentSchema,
  statusEventSchema,
  systemPromptSchema,
  toolCallResultSchema,
  toolCallSchema,
  userMessageSchema,
  workflowStateSchema,
  workflowTypeEnum,
}
export type {
  ErrorEvent,
  Issue,
  ReviewComment,
  StatusEvent,
  SystemPrompt,
  ToolCall,
  ToolCallResult,
  UserMessage,
  WorkflowState,
  WorkflowType,
}

// Neo4j data model schemas

export const workflowRunSchema = appWorkflowRunSchema.merge(
  z.object({
    createdAt: z.instanceof(DateTime),
  })
)

export const planSchema = appPlanSchema.merge(
  z.object({
    version: z.instanceof(Integer),
    createdAt: z.instanceof(DateTime),
  })
)

export const llmResponseSchema = appLLMResponseSchema
  .omit({
    workflowId: true,
  })
  .merge(
    planSchema.omit({ content: true, id: true, createdAt: true }).partial()
  )
  .merge(
    z.object({
      createdAt: z.instanceof(DateTime),
    })
  )

export const llmResponseWithPlanSchema = llmResponseSchema.merge(
  planSchema.omit({ createdAt: true })
)

export const anyEventSchema = z.discriminatedUnion("type", [
  statusEventSchema,
  systemPromptSchema,
  userMessageSchema,
  llmResponseSchema,
  toolCallSchema,
  toolCallResultSchema,
  workflowStateSchema,
  reviewCommentSchema,
  errorEventSchema,
])

export type AnyEvent = z.infer<typeof anyEventSchema>
export type LLMResponse = z.infer<typeof llmResponseSchema>
export type LLMResponseWithPlan = z.infer<typeof llmResponseWithPlanSchema>
export type Plan = z.infer<typeof planSchema>
export type WorkflowRun = z.infer<typeof workflowRunSchema>

export function isLLMResponseWithPlan(
  event: LLMResponse
): event is LLMResponseWithPlan {
  return llmResponseWithPlanSchema.safeParse(event).success
}
