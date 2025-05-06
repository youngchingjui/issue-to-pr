import { DateTime, Integer } from "neo4j-driver"
import { z } from "zod"

import {
  errorEventSchema as appErrorEventSchema,
  Issue,
  issueSchema,
  llmResponseSchema as appLLMResponseSchema,
  planSchema as appPlanSchema,
  ReviewComment,
  reviewCommentSchema,
  statusEventSchema as appStatusEventSchema,
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
  issueSchema,
  reviewCommentSchema,
  systemPromptSchema,
  toolCallResultSchema,
  toolCallSchema,
  userMessageSchema,
  workflowStateSchema,
  workflowTypeEnum,
}
export type {
  Issue,
  ReviewComment,
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

// Event schemas
export const errorEventSchema = appErrorEventSchema
  .merge(
    z.object({
      createdAt: z.instanceof(DateTime),
    })
  )
  .omit({
    workflowId: true,
  })

export const statusEventSchema = appStatusEventSchema
  .merge(
    z.object({
      createdAt: z.instanceof(DateTime),
    })
  )
  .omit({
    workflowId: true,
  })

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
export type ErrorEvent = z.infer<typeof errorEventSchema>
export type LLMResponse = z.infer<typeof llmResponseSchema>
export type LLMResponseWithPlan = z.infer<typeof llmResponseWithPlanSchema>
export type Plan = z.infer<typeof planSchema>
export type StatusEvent = z.infer<typeof statusEventSchema>
export type WorkflowRun = z.infer<typeof workflowRunSchema>

export function isLLMResponseWithPlan(
  event: LLMResponse
): event is LLMResponseWithPlan {
  return llmResponseWithPlanSchema.safeParse(event).success
}
