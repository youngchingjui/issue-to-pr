import { DateTime, Integer } from "neo4j-driver"
import { z } from "zod"

const neo4jDateTime = z.instanceof(DateTime<Integer>)
const neo4jInteger = z.instanceof(Integer)

export const workflowRunSchema = z.object({
  id: z.string(),
  type: z.string(),
  createdAt: neo4jDateTime,
  postToGithub: z.boolean().optional(),
})

// User node (app user)
export const userSchema = z.object({
  id: z.string(),
  username: z.string().optional(), // GitHub username used for auth
  joinDate: neo4jDateTime,
})

// GithubUser node (GitHub identity)
export const githubUserSchema = z.object({
  id: z.string(), // GitHub numeric ID (immutable)
  login: z.string(), // GitHub login (mutable)
  avatar_url: z.string().optional(),
  url: z.string().optional(),
  name: z.string().optional(),
})

// Webhook events that launch workflows
// Modeled after GitHub's webhook structure where:
// - Event type comes from X-GitHub-Event header ("issues", "pull_request", etc.)
// - Action comes from payload.action field ("labeled", "opened", "closed", etc.)
// - We only store the properties needed for workflow run attribution and tracking
//
// Based on app/api/webhook/github/route.ts, we currently handle:
// - issues + labeled action (with labels "resolve" or "i2pr: resolve issue")
// - pull_request + labeled action (with label "i2pr: update pr")
//
// References:
// - https://docs.github.com/en/webhooks/webhook-events-and-payloads

// Base schema for all webhook events stored in Neo4j
const baseWebhookEventSchema = z.object({
  id: z.string(), // Our internal event ID
  deliveryId: z.string().optional(), // GitHub's X-GitHub-Delivery header
  createdAt: neo4jDateTime, // When we received/stored the event
})

// Issues event - labeled action
// Triggered when a label is added to an issue
// Note: Sender information is stored via (event)-[:SENDER]->(GithubUser) relationship, not as properties
export const issuesLabeledEventSchema = baseWebhookEventSchema.extend({
  event: z.literal("issues"), // GitHub event type
  action: z.literal("labeled"), // GitHub action type
  labelName: z.string(), // The label that was added (e.g., "resolve", "i2pr: resolve issue")
  repoFullName: z.string(), // owner/repo format from payload.repository.full_name
  issueNumber: neo4jInteger, // Issue number from payload.issue.number
})

// Pull request event - labeled action
// Triggered when a label is added to a pull request
// Note: Sender information is stored via (event)-[:SENDER]->(GithubUser) relationship, not as properties
export const pullRequestLabeledEventSchema = baseWebhookEventSchema.extend({
  event: z.literal("pull_request"), // GitHub event type
  action: z.literal("labeled"), // GitHub action type
  labelName: z.string(), // The label that was added (e.g., "i2pr: update pr")
  repoFullName: z.string(), // owner/repo format from payload.repository
  prNumber: neo4jInteger, // PR number from payload.pull_request.number
})

// Discriminated union of all workflow-launching webhook events
// Uses "event" as the discriminator to match GitHub's structure
export const githubWebhookEventSchema = z.discriminatedUnion("event", [
  issuesLabeledEventSchema,
  pullRequestLabeledEventSchema,
])

// Generic schema for storing unknown/future event types
// Used when we want to store an event but don't have a specific schema yet
export const genericWebhookEventSchema = z.object({
  id: z.string(),
  deliveryId: z.string().optional(),
  event: z.string(), // Generic event type
  action: z.string().optional(), // Generic action type
  createdAt: neo4jDateTime,
})

// Installation node (GitHub App installation)
export const installationSchema = z.object({
  id: z.string(),
  githubInstallationId: z.string(),
})

// Repository node (stores GitHub repository metadata)
// Properties follow the shape from CreateWorkflowRunInput.repository
// Immutable identifiers: id, nodeId
// Mutable properties: fullName, owner, name, defaultBranch, visibility, hasIssues
export const repositorySchema = z.object({
  id: z.string(), // GitHub numeric ID (stored as string in Neo4j)
  nodeId: z.string(), // GitHub global node ID (immutable)
  fullName: z.string(), // owner/repo format (mutable, can change via rename/transfer)
  owner: z.string(), // Repository owner (mutable)
  name: z.string(), // Repository name (mutable)
  defaultBranch: z.string().optional(), // Default branch name (mutable)
  visibility: z.enum(["PUBLIC", "PRIVATE", "INTERNAL"]).optional(),
  hasIssues: z.boolean().optional(), // Whether issues are enabled
  createdAt: neo4jDateTime.optional(), // When this node was created in Neo4j
  lastUpdated: neo4jDateTime.optional(), // Last time this node was updated
})

export const workflowRunStateSchema = z.enum([
  "pending",
  "running",
  "completed",
  "error",
  "timedOut",
])

export const issueSchema = z.object({
  number: neo4jInteger,
  createdAt: neo4jDateTime.optional(),
  repoFullName: z.string(),
  title: z.string().optional(),
  body: z.string().optional(),
  state: z.enum(["open", "closed"]).optional(),
  labels: z.array(z.string()).optional(),
  assignees: z.array(z.string()).optional(),
  updatedAt: neo4jDateTime.optional(),
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
export type GenericWebhookEvent = z.infer<typeof genericWebhookEventSchema>
export type GithubUser = z.infer<typeof githubUserSchema>
export type GithubWebhookEvent = z.infer<typeof githubWebhookEventSchema>
export type Installation = z.infer<typeof installationSchema>
export type Issue = z.infer<typeof issueSchema>
export type IssuesLabeledEvent = z.infer<typeof issuesLabeledEventSchema>
export type PullRequestLabeledEvent = z.infer<
  typeof pullRequestLabeledEventSchema
>
export type Repository = z.infer<typeof repositorySchema>
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
export type User = z.infer<typeof userSchema>
export type UserMessage = z.infer<typeof userMessageSchema>
export type WorkflowRun = z.infer<typeof workflowRunSchema>
export type WorkflowRunState = z.infer<typeof workflowRunStateSchema>
