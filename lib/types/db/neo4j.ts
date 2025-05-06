import { DateTime } from "neo4j-driver"
import { z } from "zod"

import {
  ErrorEvent,
  errorEventSchema,
  llmResponseSchema as appLLMResponseSchema,
  Plan,
  planSchema,
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
  WorkflowState,
  workflowStateSchema,
} from "@/lib/types"

// Re-export for Neo4j DB layer
export {
  errorEventSchema,
  planSchema,
  reviewCommentSchema,
  statusEventSchema,
  systemPromptSchema,
  toolCallResultSchema,
  toolCallSchema,
  userMessageSchema,
  workflowStateSchema,
}
export type {
  ErrorEvent,
  Plan,
  ReviewComment,
  StatusEvent,
  SystemPrompt,
  ToolCall,
  ToolCallResult,
  UserMessage,
  WorkflowState,
}

// Neo4j data model schemas
export const llmResponseSchema = appLLMResponseSchema
  .omit({
    plan: true,
    workflowId: true,
  })
  .merge(z.object({ createdAt: z.instanceof(DateTime) }))

export const llmResponseWithPlanSchema = llmResponseSchema.merge(planSchema)

export const anyEventSchema = z.discriminatedUnion("type", [
  statusEventSchema,
  systemPromptSchema,
  userMessageSchema,
  llmResponseSchema,
  llmResponseWithPlanSchema,
  toolCallSchema,
  toolCallResultSchema,
  workflowStateSchema,
  reviewCommentSchema,
  errorEventSchema,
])

export type LLMResponse = z.infer<typeof llmResponseSchema>
export type LLMResponseWithPlan = z.infer<typeof llmResponseWithPlanSchema>
export type AnyEvent = z.infer<typeof anyEventSchema>
