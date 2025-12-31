import { DateTime, Integer } from "neo4j-driver"
import { z } from "zod"

const neo4jDateTime = z.instanceof(DateTime<Integer>)
const neo4jInteger = z.instanceof(Integer)

export const workflowRunSchema = z.object({
  id: z.string(),
  type: z.string(),
  createdAt: z.date(),
  postToGithub: z.boolean().optional(),
})

export const workflowRunStateSchema = z.enum([
  "running",
  "completed",
  "error",
  "timedOut",
])

export const issueSchema = z.object({
  number: z.number(),
  createdAt: z.date().optional(),
  repoFullName: z.string(),
  title: z.string().optional(),
  body: z.string().optional(),
  state: z.enum(["open", "closed"]).optional(),
  labels: z.array(z.string()).optional(),
  assignees: z.array(z.string()).optional(),
  updatedAt: z.date().optional(),
})

//--------Event Types--------

const eventTypes = z.enum([
  "error",
  "llmResponse",
  "llmResponseWithPlan",
  "message",
  "reasoning",
  "reviewComment",
  "status",
  "systemPrompt",
  "toolCall",
  "toolCallResult",
  "userMessage",
  "workflowState",
])

export const baseEventSchema = z.object({
  id: z.string(),
  createdAt: neo4jDateTime,
  content: z.string().optional(),
  type: eventTypes,
})

export const errorEventSchema = baseEventSchema.extend({
  type: z.literal("error"),
  content: z.string(),
})

export const statusEventSchema = baseEventSchema.extend({
  type: z.literal("status"),
  content: z.string(),
})

export const workflowStateEventSchema = baseEventSchema.extend({
  type: z.literal("workflowState"),
  state: workflowRunStateSchema,
})

export const systemPromptSchema = baseEventSchema.extend({
  type: z.literal("systemPrompt"),
  content: z.string(),
})

export const userMessageSchema = baseEventSchema.extend({
  type: z.literal("userMessage"),
  content: z.string(),
})

export const llmResponseSchema = baseEventSchema.extend({
  type: z.literal("llmResponse"),
  content: z.string(),
})

export const reasoningEventSchema = baseEventSchema.extend({
  type: z.literal("reasoning"),
  content: z.string(),
})

export const planSchema = z.object({
  id: z.string(),
  content: z.string(),
  status: z.enum(["draft", "approved", "rejected"]),
  version: neo4jInteger,
  editMessage: z.string().optional(),
})

export const llmResponseWithPlanSchema = llmResponseSchema.merge(
  z.object({
    plan: planSchema,
  })
)

export const toolCallSchema = baseEventSchema.extend({
  type: z.literal("toolCall"),
  content: z.string(),
})

export const toolCallResultSchema = baseEventSchema.extend({
  type: z.literal("toolCallResult"),
  content: z.string(),
})

export const reviewCommentSchema = baseEventSchema.extend({
  type: z.literal("reviewComment"),
  content: z.string(),
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
])

//--------Export all types--------
export type AnyEvent = z.infer<typeof anyEventSchema>
export type ErrorEvent = z.infer<typeof errorEventSchema>
export type Issue = z.infer<typeof issueSchema>
export type LLMResponse = z.infer<typeof llmResponseSchema>
export type LLMResponseWithPlan = z.infer<typeof llmResponseWithPlanSchema>
export type MessageEvent = z.infer<typeof messageEventSchema>
export type Plan = z.infer<typeof planSchema>
export type ReasoningEvent = z.infer<typeof reasoningEventSchema>
export type ReviewComment = z.infer<typeof reviewCommentSchema>
export type StatusEvent = z.infer<typeof statusEventSchema>
export type SystemPrompt = z.infer<typeof systemPromptSchema>
export type ToolCall = z.infer<typeof toolCallSchema>
export type ToolCallResult = z.infer<typeof toolCallResultSchema>
export type UserMessage = z.infer<typeof userMessageSchema>
export type WorkflowRun = z.infer<typeof workflowRunSchema>
export type WorkflowRunState = z.infer<typeof workflowRunStateSchema>
