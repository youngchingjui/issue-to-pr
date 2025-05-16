import { zodFunction } from "openai/helpers/zod"
import { ChatModel } from "openai/resources"
import { z } from "zod"

// Tools
export interface Tool<T extends z.ZodType, U = unknown> {
  tool: ReturnType<typeof zodFunction>
  parameters: T
  handler: (params: z.infer<T>, ...args: U[]) => Promise<string>
}

// Agents
export type AgentConstructorParams = {
  model?: ChatModel
  systemPrompt?: string
  apiKey?: string
}

// Issues
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

// WorkflowRuns
export const workflowTypeEnum = z.enum([
  "commentOnIssue",
  "resolveIssue",
  "identifyPRGoal",
  "reviewPullRequest",
])

export const workflowRunSchema = z.object({
  id: z.string(),
  type: workflowTypeEnum,
  createdAt: z.date(),
  postToGithub: z.boolean().optional(),
})

// Plans
export const planSchema = z.object({
  id: z.string(),
  content: z.string(),
  status: z.enum(["draft", "approved", "rejected"]),
  version: z.number(),
  createdAt: z.date(),
  editMessage: z.string().optional(),
})

export const planMetaSchema = planSchema.omit({
  content: true,
  createdAt: true,
})

// Events
const eventTypes = z.enum([
  "error",
  "llmResponse",
  "llmResponseWithPlan",
  "message",
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
  createdAt: z.date(),
  workflowId: z.string(),
  content: z.string().optional(),
  type: eventTypes,
})

export const llmResponseSchema = baseEventSchema.merge(
  z.object({
    type: z.literal("llmResponse"),
    content: z.string(),
    model: z
      .string()
      .optional()
      .describe("String description of LLM model used to generate response"),
  })
)

export const llmResponseWithPlanSchema = baseEventSchema.merge(
  z.object({
    type: z.literal("llmResponseWithPlan"),
    content: z.string(),
    plan: planMetaSchema,
  })
)

export const statusEventSchema = baseEventSchema.extend({
  type: z.literal("status"),
  content: z.string(),
})

export const systemPromptSchema = baseEventSchema.extend({
  type: z.literal("systemPrompt"),
  content: z.string(),
})

export const userMessageSchema = baseEventSchema.extend({
  type: z.literal("userMessage"),
  content: z.string(),
})

export const toolCallSchema = baseEventSchema.extend({
  type: z.literal("toolCall"),
  toolName: z.string(),
  toolCallId: z.string(),
  args: z.string(),
})

export const toolCallResultSchema = baseEventSchema.extend({
  type: z.literal("toolCallResult"),
  toolCallId: z.string(),
  toolName: z.string(),
  content: z.string(),
})

// TODO: Change 'running' to 'inProgress'
export const workflowRunStateSchema = z.enum(["running", "completed", "error"])

export const workflowStateEventSchema = baseEventSchema.extend({
  type: z.literal("workflowState"),
  state: workflowRunStateSchema,
})

export const reviewCommentSchema = baseEventSchema.extend({
  type: z.literal("reviewComment"),
  content: z.string(),
  planId: z.string(),
})

export const errorEventSchema = baseEventSchema.extend({
  type: z.literal("error"),
  content: z.string(),
})

export const messageEventSchema = z.discriminatedUnion("type", [
  userMessageSchema,
  systemPromptSchema,
  llmResponseSchema,
  llmResponseWithPlanSchema,
  toolCallSchema,
  toolCallResultSchema,
])

export const anyEventSchema = z.discriminatedUnion("type", [
  ...messageEventSchema.options,
  errorEventSchema,
  reviewCommentSchema,
  statusEventSchema,
  workflowStateEventSchema,
])

// Type exports
export type AnyEvent = z.infer<typeof anyEventSchema>
export type BaseEvent = z.infer<typeof baseEventSchema>
export type ErrorEvent = z.infer<typeof errorEventSchema>
export type EventTypes = z.infer<typeof eventTypes>
export type Issue = z.infer<typeof issueSchema>
export type LLMResponse = z.infer<typeof llmResponseSchema>
export type LLMResponseWithPlan = z.infer<typeof llmResponseWithPlanSchema>
export type MessageEvent = z.infer<typeof messageEventSchema>
export type Plan = z.infer<typeof planSchema>
export type PlanMeta = z.infer<typeof planMetaSchema>
export type ReviewComment = z.infer<typeof reviewCommentSchema>
export type StatusEvent = z.infer<typeof statusEventSchema>
export type SystemPrompt = z.infer<typeof systemPromptSchema>
export type ToolCall = z.infer<typeof toolCallSchema>
export type ToolCallResult = z.infer<typeof toolCallResultSchema>
export type UserMessage = z.infer<typeof userMessageSchema>
export type WorkflowRun = z.infer<typeof workflowRunSchema>
export type WorkflowStateEvent = z.infer<typeof workflowStateEventSchema>
export type WorkflowRunState = z.infer<typeof workflowRunStateSchema>
export type WorkflowType = z.infer<typeof workflowTypeEnum>
