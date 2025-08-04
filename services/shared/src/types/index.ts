import { z, ZodType } from "zod"

// Core workflow types that both the Next.js app and worker services need

// Tools
export interface Tool<Schema extends ZodType, Output> {
  type: "function"
  function: {
    name: string
    parameters: Record<string, unknown>
    description: string
    type: "function"
  }
  schema: Schema
  handler: (params: z.infer<Schema>) => Promise<Output> | Output
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
  "autoResolveIssue",
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

// Tasks stored locally per repo
export const taskSchema = z.object({
  id: z.string(),
  repoFullName: z.string(),
  createdBy: z.string(),
  createdAt: z.date(),
  title: z.string().optional(),
  body: z.string().optional(),
  syncedToGithub: z.boolean(),
  githubIssueNumber: z.number().optional(),
})

// Events
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

export const reasoningEventSchema = baseEventSchema.extend({
  type: z.literal("reasoning"),
  title: z.string(),
  content: z.string(),
})

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

export const workflowRunStateSchema = z.enum([
  "running",
  "completed",
  "error",
  "timedOut",
])

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
  reasoningEventSchema,
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

// Environment settings
export const environmentEnum = z
  .enum(["typescript", "python"])
  .describe(
    "The environment to use for the repository. e.g. 'typescript' or 'python'"
  )

export const repoSettingsSchema = z.object({
  environment: environmentEnum.optional(),
  setupCommands: z
    .string()
    .optional()
    .describe(
      "Setup commands to run when the repository is cloned. e.g. ['npm install', 'pip install -r requirements.txt']"
    ),
  autoRunCommentOnIssue: z
    .boolean()
    .optional()
    .describe(
      "Automatically run the commentOnIssue workflow when a new issue is created"
    ),
  autoPostIssueCommentToGitHub: z
    .boolean()
    .optional()
    .describe(
      "Post the generated comment back to GitHub after commentOnIssue completes"
    ),
  autoRunResolveIssue: z
    .boolean()
    .optional()
    .describe(
      "Automatically run the resolveIssue workflow when a new issue is created"
    ),
  autoPostPrToGitHub: z
    .boolean()
    .optional()
    .describe("Create a pull request on GitHub after resolveIssue completes"),
  lastUpdated: z.date().optional(),
})

// Repo Environment Type
export type RepoEnvironment =
  | { kind: "host"; root: string }
  | { kind: "container"; name: string; mount?: string }

/**
 * Helper to normalize legacy baseDir string to RepoEnvironment
 */
export function asRepoEnvironment(
  arg: string | RepoEnvironment
): RepoEnvironment {
  return typeof arg === "string"
    ? { kind: "host", root: arg } // auto-wrap legacy baseDir
    : arg
}

// Job data schemas for queue system
export const resolveIssueJobDataSchema = z.object({
  issueNumber: z.number(),
  repoFullName: z.string(),
  apiKey: z.string(),
  jobId: z.string(),
  createPR: z.boolean().default(false),
  planId: z.string().optional(),
  environment: environmentEnum.optional(),
  installCommand: z.string().optional(),
})

export const commentOnIssueJobDataSchema = z.object({
  issueNumber: z.number(),
  repoFullName: z.string(),
  apiKey: z.string(),
  jobId: z.string(),
  postToGithub: z.boolean().default(false),
})

export const autoResolveIssueJobDataSchema = z.object({
  issueNumber: z.number(),
  repoFullName: z.string(),
  apiKey: z.string(),
  jobId: z.string(),
})

// Type exports
export type AnyEvent = z.infer<typeof anyEventSchema>
export type BaseEvent = z.infer<typeof baseEventSchema>
export type Environment = z.infer<typeof environmentEnum>
export type ErrorEvent = z.infer<typeof errorEventSchema>
export type EventTypes = z.infer<typeof eventTypes>
export type Issue = z.infer<typeof issueSchema>
export type LLMResponse = z.infer<typeof llmResponseSchema>
export type LLMResponseWithPlan = z.infer<typeof llmResponseWithPlanSchema>
export type MessageEvent = z.infer<typeof messageEventSchema>
export type ReasoningEvent = z.infer<typeof reasoningEventSchema>
export type Plan = z.infer<typeof planSchema>
export type PlanMeta = z.infer<typeof planMetaSchema>
export type RepoSettings = z.infer<typeof repoSettingsSchema>
export type ReviewComment = z.infer<typeof reviewCommentSchema>
export type StatusEvent = z.infer<typeof statusEventSchema>
export type SystemPrompt = z.infer<typeof systemPromptSchema>
export type ToolCall = z.infer<typeof toolCallSchema>
export type ToolCallResult = z.infer<typeof toolCallResultSchema>
export type Task = z.infer<typeof taskSchema>
export type UserMessage = z.infer<typeof userMessageSchema>
export type WorkflowRun = z.infer<typeof workflowRunSchema>
export type WorkflowRunState = z.infer<typeof workflowRunStateSchema>
export type WorkflowStateEvent = z.infer<typeof workflowStateEventSchema>
export type WorkflowType = z.infer<typeof workflowTypeEnum>

// Job data types
export type ResolveIssueJobData = z.infer<typeof resolveIssueJobDataSchema>
export type CommentOnIssueJobData = z.infer<typeof commentOnIssueJobDataSchema>
export type AutoResolveIssueJobData = z.infer<
  typeof autoResolveIssueJobDataSchema
>
