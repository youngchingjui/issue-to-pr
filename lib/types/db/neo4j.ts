import { DateTime, Integer } from "neo4j-driver"
import { z } from "zod"

import {
  errorEventSchema as appErrorEventSchema,
  issueSchema as appIssueSchema,
  llmResponseSchema as appLLMResponseSchema,
  planSchema as appPlanSchema,
  ReviewComment,
  reviewCommentSchema,
  statusEventSchema as appStatusEventSchema,
  systemPromptSchema as appSystemPromptSchema,
  ToolCall,
  ToolCallResult,
  toolCallResultSchema,
  toolCallSchema,
  userMessageSchema as appUserMessageSchema,
  workflowRunSchema as appWorkflowRunSchema,
  WorkflowState,
  workflowStateSchema,
  WorkflowType,
  workflowTypeEnum,
} from "@/lib/types"

// Re-export for Neo4j DB layer
export {
  reviewCommentSchema,
  toolCallResultSchema,
  toolCallSchema,
  workflowStateSchema,
  workflowTypeEnum,
}
export type {
  ReviewComment,
  ToolCall,
  ToolCallResult,
  WorkflowState,
  WorkflowType,
}

// Neo4j data model schemas
export const issueSchema = appIssueSchema
  .omit({
    createdAt: true,
    updatedAt: true,
    title: true,
    body: true,
    state: true,
    labels: true,
    assignees: true,
  })
  .merge(
    z.object({
      number: z.instanceof(Integer),
    })
  )

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

export const systemPromptSchema = appSystemPromptSchema
  .omit({ workflowId: true })
  .merge(z.object({ createdAt: z.instanceof(DateTime) }))

export const userMessageSchema = appUserMessageSchema
  .omit({ workflowId: true })
  .merge(z.object({ createdAt: z.instanceof(DateTime) }))

export const llmResponseSchema = appLLMResponseSchema
  .omit({ workflowId: true })
  .merge(z.object({ createdAt: z.instanceof(DateTime) }))

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
export type Issue = z.infer<typeof issueSchema>
export type LLMResponse = z.infer<typeof llmResponseSchema>
export type LLMResponseWithPlan = z.infer<typeof llmResponseWithPlanSchema>
export type Plan = z.infer<typeof planSchema>
export type StatusEvent = z.infer<typeof statusEventSchema>
export type SystemPrompt = z.infer<typeof systemPromptSchema>
export type UserMessage = z.infer<typeof userMessageSchema>
export type WorkflowRun = z.infer<typeof workflowRunSchema>

export function isLLMResponseWithPlan(
  event: LLMResponse
): event is LLMResponseWithPlan {
  return llmResponseWithPlanSchema.safeParse(event).success
}
