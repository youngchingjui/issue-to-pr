// These schemas define the nodes on Neo4j
// You'll have to separately map the relationships to a schema after retrieving the nodes

// TODO: We haven't touched Settings schemas here yet. They'll need to be added.

import { DateTime, Integer } from "neo4j-driver"
import { z } from "zod"

const neo4jDateTime = z.instanceof(DateTime<Integer>)
const neo4jInteger = z.instanceof(Integer)

export const workflowRunStateSchema = z.enum([
  "pending",
  "running",
  "completed",
  "error",
  "timedOut",
])

// Workflow run types - must match WorkflowRunTypes from domain
const workflowRunTypeSchema = z.enum([
  "summarizeIssue",
  "generateIssueTitle",
  "resolveIssue",
  "createDependentPR",
  "reviewPullRequest",
  "commentOnIssue",
])

export const workflowRunSchema = z.object({
  id: z.string(),
  type: workflowRunTypeSchema,
  createdAt: neo4jDateTime,
  postToGithub: z.boolean().optional(),
  state: workflowRunStateSchema.optional(),
})

// User node (app user)
export const userSchema = z.object({
  id: z.string(),
  username: z.string().optional(), // GitHub username used for auth
  joinDate: neo4jDateTime.optional(),
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

// Repository node (stores GitHub repository metadata)
// Properties follow the shape from CreateWorkflowRunInput.repository
// Immutable identifiers: id, nodeId
// Mutable properties: fullName, owner, name, defaultBranch, visibility, hasIssues
export const repositorySchema = z.object({
  id: z.string().optional(), // GitHub numeric ID (stored as string in Neo4j)
  nodeId: z.string().optional(), // GitHub global node ID (immutable)
  fullName: z.string(), // Repository full name in "owner/name" format (mutable)
  owner: z.string(), // Repository owner (mutable)
  name: z.string(), // Repository name (mutable)
  defaultBranch: z.string().optional(), // Default branch name (mutable)
  visibility: z.enum(["PUBLIC", "PRIVATE", "INTERNAL"]).optional(),
  hasIssues: z.boolean().optional(), // Whether issues are enabled
  createdAt: neo4jDateTime.optional(), // When this node was created in Neo4j
  lastUpdated: neo4jDateTime.optional(), // Last time this node was updated
  githubInstallationId: z.string().optional(), // Store this here instead of a separate node, since we'll only have 1 Github App to reference
})

// Commit node (stores Git commit metadata)
// All fields are immutable - a commit's SHA is derived from its content,
// so changing any field would result in a different SHA (a different commit)
// Reference: https://docs.github.com/en/rest/git/commits
// Note: Most fields are optional to support progressive attachment
export const commitSchema = z.object({
  // Immutable identifiers
  sha: z.string(), // Primary key - Git SHA-1 hash (40 hex chars)
  nodeId: z.string().optional(), // GitHub GraphQL node ID

  // Commit content (immutable)
  message: z.string().optional(), // Full commit message
  treeSha: z.string().optional(), // Git tree object SHA (represents file structure)

  // Author (person who wrote the code)
  authorName: z.string().optional(),
  authorEmail: z.string().optional(),
  authoredAt: neo4jDateTime.optional(),

  // Committer (person who applied the commit to the repository)
  // Often same as author, but differs in cases like rebasing, cherry-picking, or applying patches
  committerName: z.string().optional(),
  committerEmail: z.string().optional(),
  committedAt: neo4jDateTime.optional(),

  // Metadata about when we stored this in Neo4j
  createdAt: neo4jDateTime.optional(),
})

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

// TODO: It seems that we mix "messages" with "events", but I think these concepts should be separated.
// TODO: We're not really using llmResponseWithPlan anymore, I think we can start to remove this feature.
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

export const workflowStateEventSchema = baseEventSchema
  .omit({ content: true })
  .extend({
    type: z.literal("workflowState"),
    state: workflowRunStateSchema,
  })

export const systemPromptSchema = baseEventSchema.extend({
  type: z.literal("systemPrompt"),
  content: z.string(),
  data: z.string().optional(), // Legacy, use content instead
  timestamp: neo4jDateTime.optional(), // Legacy, use createdAt instead
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
  summary: z.string(),
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
  toolName: z.string(),
  toolCallId: z.string(),
  args: z.string().optional(),
  data: z.string().optional(), // Legacy, use content instead
  timestamp: neo4jDateTime.optional(), // Legacy, use createdAt instead
})

export const toolCallResultSchema = baseEventSchema.extend({
  type: z.literal("toolCallResult"),
  toolCallId: z.string(),
  toolName: z.string(),
  content: z.string(),
  data: z.string().optional(), // Legacy, use content instead
  timestamp: neo4jDateTime.optional(), // Legacy, use createdAt instead
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
export type Commit = z.infer<typeof commitSchema>
export type ErrorEvent = z.infer<typeof errorEventSchema>
export type GenericWebhookEvent = z.infer<typeof genericWebhookEventSchema>
export type GithubUser = z.infer<typeof githubUserSchema>
export type GithubWebhookEvent = z.infer<typeof githubWebhookEventSchema>
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
