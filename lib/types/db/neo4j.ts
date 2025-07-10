import { DateTime, Integer } from "neo4j-driver"
import { z } from "zod"

import {
  errorEventSchema as appErrorEventSchema,
  issueSchema as appIssueSchema,
  llmResponseSchema as appLLMResponseSchema,
  planSchema as appPlanSchema,
  repoSettingsSchema as appRepoSettingsSchema,
  reviewCommentSchema as appReviewCommentSchema,
  settingsSchema as appSettingsSchema,
  statusEventSchema as appStatusEventSchema,
  systemPromptSchema as appSystemPromptSchema,
  taskSchema as appTaskSchema,
  toolCallResultSchema as appToolCallResultSchema,
  toolCallSchema as appToolCallSchema,
  userMessageSchema as appUserMessageSchema,
  workflowRunSchema as appWorkflowRunSchema,
  WorkflowRunState,
  workflowRunStateSchema,
  workflowStateEventSchema as appWorkflowStateEventSchema,
  WorkflowType,
  workflowTypeEnum,
} from "@/lib/types"

// Re-export for Neo4j DB layer
export { workflowRunStateSchema, workflowTypeEnum }
export type { WorkflowRunState, WorkflowType }

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

export const taskSchema = appTaskSchema.merge(
  z.object({
    createdAt: z.instanceof(DateTime),
    githubIssueNumber: z.instanceof(Integer).optional(),
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

export const workflowStateEventSchema = appWorkflowStateEventSchema
  .omit({ workflowId: true })
  .merge(z.object({ createdAt: z.instanceof(DateTime) }))

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

export const toolCallSchema = appToolCallSchema
  .omit({ workflowId: true })
  .merge(z.object({ createdAt: z.instanceof(DateTime) }))

export const toolCallResultSchema = appToolCallResultSchema
  .omit({ workflowId: true })
  .merge(z.object({ createdAt: z.instanceof(DateTime) }))

export const reviewCommentSchema = appReviewCommentSchema
  .omit({ workflowId: true })
  .merge(z.object({ createdAt: z.instanceof(DateTime) }))

export const messageEventSchema = z.union([
  llmResponseWithPlanSchema,
  z.discriminatedUnion("type", [
    userMessageSchema,
    systemPromptSchema,
    llmResponseSchema,
    toolCallSchema,
    toolCallResultSchema,
  ]),
])

export const anyEventSchema = z.discriminatedUnion("type", [
  errorEventSchema,
  llmResponseSchema,
  reviewCommentSchema,
  statusEventSchema,
  systemPromptSchema,
  toolCallResultSchema,
  toolCallSchema,
  userMessageSchema,
  workflowStateEventSchema,
])

export type AnyEvent = z.infer<typeof anyEventSchema>
export type ErrorEvent = z.infer<typeof errorEventSchema>
export type Issue = z.infer<typeof issueSchema>
export type LLMResponse = z.infer<typeof llmResponseSchema>
export type LLMResponseWithPlan = z.infer<typeof llmResponseWithPlanSchema>
export type MessageEvent = z.infer<typeof messageEventSchema>
export type Plan = z.infer<typeof planSchema>
export type Task = z.infer<typeof taskSchema>
export type ReviewComment = z.infer<typeof reviewCommentSchema>
export type StatusEvent = z.infer<typeof statusEventSchema>
export type SystemPrompt = z.infer<typeof systemPromptSchema>
export type ToolCall = z.infer<typeof toolCallSchema>
export type ToolCallResult = z.infer<typeof toolCallResultSchema>
export type UserMessage = z.infer<typeof userMessageSchema>
export type WorkflowRun = z.infer<typeof workflowRunSchema>
export type WorkflowStateEvent = z.infer<typeof workflowStateEventSchema>

export function isLLMResponseWithPlan(
  event: LLMResponse
): event is LLMResponseWithPlan {
  return llmResponseWithPlanSchema.safeParse(event).success
}

// ---- Repo Settings (repository-level) ----
export const repoSettingsSchema = appRepoSettingsSchema.merge(
  z.object({
    // Ensure Neo4j temporal type is preserved while at repository layer
    lastUpdated: z.instanceof(DateTime),
  })
)

export type RepoSettings = z.infer<typeof repoSettingsSchema>

// ---- User Settings ----
export const userSettingsSchema = appSettingsSchema.merge(
  z.object({
    lastUpdated: z.instanceof(DateTime),
  })
)

export type UserSettings = z.infer<typeof userSettingsSchema>
