import { ChatModel } from "openai/resources"
import {
  WorkflowStateEventSchema,
  WorkflowStatusEventSchema,
} from "shared/entities/events/WorkflowEvent"
import { z, ZodType } from "zod"

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
  handler: (params: z.input<Schema>) => Promise<Output> | Output
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
  // LLM-parsed requirements in Markdown (bullet points preferred)
  requirements: z.string().optional(),
})

// WorkflowRuns
// Accept any string for workflow type so all current and future workflow types
// are supported in the UI and storage without schema failures.
export const workflowTypeEnum = z.string()

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
  // New field for all new events
  summary: z.string().optional(),
  // Legacy support: allow old events that used `content`
  content: z.string().optional(),
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

// Added "timedOut" to represent runs that exceeded the maximum allowed duration.
export const workflowRunStateSchema = z.enum([
  "running",
  "completed",
  "error",
  "timedOut",
])

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
  WorkflowStatusEventSchema,
  WorkflowStateEventSchema,
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
  roles: z.array(z.string()).describe("Roles or tags for user").optional(),
  // Add more user-specific settings here as needed
})

// ---- Repo-level Settings Schema ----
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
export type RepoSettings = z.infer<typeof repoSettingsSchema>

// Blog Posts
export const blogPostSchema = z.object({
  slug: z.string().optional(),
  title: z.string().optional(),
  date: z.date().nullable().optional(),
  summary: z.string().optional(),
})

// ---- Repo Environment Type ----
// Represents where repository operations are executed – either directly on the host
// file-system or inside a named Docker container (optionally with a different mount path).
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

// Type exports
export type AnyEvent = z.infer<typeof anyEventSchema>
export type BaseEvent = z.infer<typeof baseEventSchema>
export type BlogPost = z.infer<typeof blogPostSchema>
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
export type ReviewComment = z.infer<typeof reviewCommentSchema>
export type Settings = z.infer<typeof settingsSchema>
export type SettingsType = z.infer<typeof settingsTypeEnum>
export type SystemPrompt = z.infer<typeof systemPromptSchema>
export type ToolCall = z.infer<typeof toolCallSchema>
export type ToolCallResult = z.infer<typeof toolCallResultSchema>
export type Task = z.infer<typeof taskSchema>
export type UserMessage = z.infer<typeof userMessageSchema>
export type WorkflowRun = z.infer<typeof workflowRunSchema>
export type WorkflowRunState = z.infer<typeof workflowRunStateSchema>
export type WorkflowType = z.infer<typeof workflowTypeEnum>

