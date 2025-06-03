import { ChatModel } from "openai/resources"
import { z, ZodType } from "zod"

// Tools
export interface Tool<Schema extends ZodType, Output> {
  type: "function"
  function: {
    name: string
    parameters: Record<string, unknown>
    description: string
  }
  schema: Schema
  handler: (params: z.infer<Schema>) => Promise<Output> | Output
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
  "alignmentCheck",
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

// ---- Settings Schemas ----

/**
 * Base settings schema.
 * All properties optional. Add more user-specific settings as needed.
 */
export const settingsTypeEnum = z.enum(["user", "repo"])

export const settingsSchema = z.object({
  type: settingsTypeEnum,
  openAIApiKey: z
    .string()
    .optional()
    .describe(
      "OpenAI API key used throughout the application (user-specific, optional)."
    ),
  autoPostPlanToGitHubIssue: z
    .boolean()
    .optional()
    .describe(
      "If true, the system will auto-post plans to GitHub issues for this user."
    ),
  lastUpdated: z
    .date()
    .describe("The date and time when the settings were last updated.")
    .default(new Date()),
  // Add more user-specific settings here as needed
})

// Blog Posts
export const blogPostSchema = z.object({
  slug: z.string().optional(),
  title: z.string().optional(),
  date: z.date().nullable().optional(),
  summary: z.string().optional(),
})

// Type exports
export type AnyEvent = z.infer<typeof anyEventSchema>
export type BaseEvent = z.infer<typeof baseEventSchema>
export type BlogPost = z.infer<typeof blogPostSchema>
export type ErrorEvent = z.infer<typeof errorEventSchema>
export type EventTypes = z.infer<typeof eventTypes>
export type Issue = z.infer<typeof issueSchema>
export type LLMResponse = z.infer<typeof llmResponseSchema>
export type LLMResponseWithPlan = z.infer<typeof llmResponseWithPlanSchema>
export type MessageEvent = z.infer<typeof messageEventSchema>
export type Plan = z.infer<typeof planSchema>
export type PlanMeta = z.infer<typeof planMetaSchema>
export type ReviewComment = z.infer<typeof reviewCommentSchema>
export type Settings = z.infer<typeof settingsSchema>
export type SettingsType = z.infer<typeof settingsTypeEnum>
export type StatusEvent = z.infer<typeof statusEventSchema>
export type SystemPrompt = z.infer<typeof systemPromptSchema>
export type ToolCall = z.infer<typeof toolCallSchema>
export type ToolCallResult = z.infer<typeof toolCallResultSchema>
export type UserMessage = z.infer<typeof userMessageSchema>
export type WorkflowRun = z.infer<typeof workflowRunSchema>
export type WorkflowRunState = z.infer<typeof workflowRunStateSchema>
export type WorkflowStateEvent = z.infer<typeof workflowStateEventSchema>
export type WorkflowType = z.infer<typeof workflowTypeEnum>
