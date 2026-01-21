import { DateTime, Integer, isDateTime } from "neo4j-driver"
import { z } from "zod"

import {
  errorEventSchema as appErrorEventSchema,
  issueSchema as appIssueSchema,
  llmResponseSchema as appLLMResponseSchema,
  planSchema as appPlanSchema,
  reasoningEventSchema as appReasoningEventSchema,
  repoSettingsSchema as appRepoSettingsSchema,
  reviewCommentSchema as appReviewCommentSchema,
  settingsSchema as appSettingsSchema,
  systemPromptSchema as appSystemPromptSchema,
  taskSchema as appTaskSchema,
  toolCallResultSchema as appToolCallResultSchema,
  toolCallSchema as appToolCallSchema,
  userMessageSchema as appUserMessageSchema,
  workflowRunSchema as appWorkflowRunSchema,
  type WorkflowRunState,
  workflowRunStateSchema,
  type WorkflowType,
  workflowTypeEnum,
} from "@/shared/lib/types"

// Re-export for Neo4j DB layer
export { workflowRunStateSchema, workflowTypeEnum }
export type { WorkflowRunState, WorkflowType }

// Use a predicate instead of z.instanceof(DateTime) to avoid TS2742.
// instanceof leaks neo4j-driver-core types into inferred exports; this keeps
// runtime validation (DateTime-like) while keeping inferred types portable.
const Neo4jDateTime = z.custom<DateTime>(isDateTime, {
  message: "Input not instance of DateTime",
})

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
    createdAt: Neo4jDateTime,
  })
)

export const planSchema = appPlanSchema.merge(
  z.object({
    version: z.instanceof(Integer),
    createdAt: Neo4jDateTime,
  })
)

export const taskSchema = appTaskSchema.merge(
  z.object({
    createdAt: Neo4jDateTime,
    githubIssueNumber: z.instanceof(Integer).optional(),
  })
)

// Event schemas
export const errorEventSchema = appErrorEventSchema
  .merge(
    z.object({
      createdAt: Neo4jDateTime,
    })
  )
  .omit({
    workflowId: true,
  })

export const statusEventSchema = z.object({
  id: z.string(),
  createdAt: Neo4jDateTime,
  type: z.literal("status"),
  content: z.string(),
})

export const workflowStateEventSchema = z.object({
  id: z.string(),
  createdAt: Neo4jDateTime,
  type: z.literal("workflowState"),
  state: z.enum(["running", "completed", "error", "timedOut"]),
  content: z.string().optional(),
})

export const systemPromptSchema = appSystemPromptSchema
  .omit({ workflowId: true })
  .merge(z.object({ createdAt: Neo4jDateTime }))

export const userMessageSchema = appUserMessageSchema
  .omit({ workflowId: true })
  .merge(z.object({ createdAt: Neo4jDateTime }))

export const llmResponseSchema = appLLMResponseSchema
  .omit({ workflowId: true })
  .merge(z.object({ createdAt: Neo4jDateTime }))

export const reasoningEventSchema = appReasoningEventSchema
  .omit({ workflowId: true })
  .merge(z.object({ createdAt: Neo4jDateTime }))

export const llmResponseWithPlanSchema = llmResponseSchema.merge(
  planSchema.omit({ createdAt: true })
)

export const toolCallSchema = appToolCallSchema
  .omit({ workflowId: true })
  .merge(z.object({ createdAt: Neo4jDateTime }))

export const toolCallResultSchema = appToolCallResultSchema
  .omit({ workflowId: true })
  .merge(z.object({ createdAt: Neo4jDateTime }))

export const reviewCommentSchema = appReviewCommentSchema
  .omit({ workflowId: true })
  .merge(z.object({ createdAt: Neo4jDateTime }))

// Primary workflow event schemas (camelCase - standard format)
export const workflowStartedEventSchema = z.object({
  id: z.string(),
  createdAt: Neo4jDateTime,
  type: z.literal("workflowStarted"),
  content: z.string().optional(),
})

export const workflowCompletedEventSchema = z.object({
  id: z.string(),
  createdAt: Neo4jDateTime,
  type: z.literal("workflowCompleted"),
  content: z.string().optional(),
})

export const workflowCancelledEventSchema = z.object({
  id: z.string(),
  createdAt: Neo4jDateTime,
  type: z.literal("workflowCancelled"),
  content: z.string().optional(),
})

export const workflowErrorEventSchema = z.object({
  id: z.string(),
  createdAt: Neo4jDateTime,
  type: z.literal("workflowError"),
  message: z.string().optional(),
  content: z.string().optional(),
})

export const workflowCheckpointSavedEventSchema = z.object({
  id: z.string(),
  createdAt: Neo4jDateTime,
  type: z.literal("workflowCheckpointSaved"),
  content: z.string().optional(),
})

export const workflowCheckpointRestoredEventSchema = z.object({
  id: z.string(),
  createdAt: Neo4jDateTime,
  type: z.literal("workflowCheckpointRestored"),
  content: z.string().optional(),
})

export const messageEventSchema = z.union([
  llmResponseWithPlanSchema,
  reasoningEventSchema,
  z.discriminatedUnion("type", [
    userMessageSchema,
    systemPromptSchema,
    llmResponseSchema,
    toolCallSchema,
    toolCallResultSchema,
  ]),
])

// TODO: We're mixing messages and events here. we should separate them into different concepts.
export const anyEventSchema = z.discriminatedUnion("type", [
  errorEventSchema,
  llmResponseSchema,
  reasoningEventSchema,
  reviewCommentSchema,
  statusEventSchema,
  systemPromptSchema,
  toolCallResultSchema,
  toolCallSchema,
  userMessageSchema,
  workflowStateEventSchema,
  workflowStartedEventSchema,
  workflowCompletedEventSchema,
  workflowCancelledEventSchema,
  workflowErrorEventSchema,
  workflowCheckpointSavedEventSchema,
  workflowCheckpointRestoredEventSchema,
])

export type AnyEvent = z.infer<typeof anyEventSchema>
export type ErrorEvent = z.infer<typeof errorEventSchema>
export type Issue = z.infer<typeof issueSchema>
export type LLMResponse = z.infer<typeof llmResponseSchema>
export type LLMResponseWithPlan = z.infer<typeof llmResponseWithPlanSchema>
export type MessageEvent = z.infer<typeof messageEventSchema>
export type ReasoningEvent = z.infer<typeof reasoningEventSchema>
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
export type WorkflowStartedEvent = z.infer<typeof workflowStartedEventSchema>
export type WorkflowCompletedEvent = z.infer<
  typeof workflowCompletedEventSchema
>
export type WorkflowCancelledEvent = z.infer<
  typeof workflowCancelledEventSchema
>
export type WorkflowCheckpointSavedEvent = z.infer<
  typeof workflowCheckpointSavedEventSchema
>
export type WorkflowCheckpointRestoredEvent = z.infer<
  typeof workflowCheckpointRestoredEventSchema
>

export function isLLMResponseWithPlan(
  event: LLMResponse
): event is LLMResponseWithPlan {
  return llmResponseWithPlanSchema.safeParse(event).success
}

// ---- Repo Settings (repository-level) ----
export const repoSettingsSchema = appRepoSettingsSchema.merge(
  z.object({
    // Ensure Neo4j temporal type is preserved while at repository layer
    lastUpdated: Neo4jDateTime,
  })
)

export type RepoSettings = z.infer<typeof repoSettingsSchema>

// ---- User Settings ----
export const userSettingsSchema = appSettingsSchema.merge(
  z.object({
    lastUpdated: Neo4jDateTime,
  })
)

export type UserSettings = z.infer<typeof userSettingsSchema>
