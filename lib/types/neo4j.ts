// Core Entity Types
// TODO: Use zod to create schemas, then export types from schemas
// TODO: Define baseline application-level schemas, then extend database schemas from there
// TODO: move this file to /types/db/neo4j.ts

export type User = {
  id: string // Maps to PostgreSQL users.id
  displayName: string // Cached display name for convenient querying
}

export type Repository = {
  name: string // Repository name
  owner: string // Repository owner
  id: string // GitHub repository ID
  // Mutable properties from GitHub API - not stored in Neo4j
  description?: string
  defaultBranch?: string
  settings?: Record<string, unknown>
  visibility?: "public" | "private"
}

export type Issue = {
  number: number // Issue number
  id: string // GitHub issue ID
  createdAt: Date // Creation timestamp
  repoFullName: string // Repository name
  // Mutable properties from GitHub API - not stored in Neo4j
  title?: string
  body?: string
  state?: "open" | "closed"
  labels?: string[]
  assignees?: string[]
  updatedAt?: Date
}

export type PullRequest = {
  number: number // PR number
  id: string // GitHub PR ID
  createdAt: Date // Creation timestamp
  // Mutable properties from GitHub API - not stored in Neo4j
  title?: string
  body?: string
  state?: "open" | "closed" | "merged"
  branch?: string
  reviewers?: string[]
  labels?: string[]
  mergeable?: boolean
  updatedAt?: Date
}

// Workflow Management Types

export type WorkflowType =
  | "commentOnIssue"
  | "resolveIssue"
  | "identifyPRGoal"
  | "reviewPullRequest"

export type WorkflowRun = {
  id: string
  workflowType: WorkflowType
  created_at: Date // TODO: Change to `createdAt`
  // status - need this for application level, but not stored in Neo4j
}

// Event Types

// Define the possible event types
type EventType =
  | "status"
  | "message"
  | "toolCall"
  | "toolCallResult"
  | "workflowState"
  | "reviewComment"
  | "systemPrompt"
  | "userMessage"
  | "llmResponse"
  | "error"

// Base Event properties for all events
export interface BaseEvent {
  id: string
  createdAt: Date
  workflowId: string
  content?: string
  type: EventType
}

// Basic Event
export interface StatusEvent extends BaseEvent {
  type: "status"
}

// Message Events
export interface SystemPrompt extends BaseEvent {
  type: "systemPrompt"
  content: string
}

export interface UserMessage extends BaseEvent {
  type: "userMessage"
  content: string
}

export interface LLMResponse extends BaseEvent {
  type: "llmResponse"
  content: string
}

// Tool Events
export interface ToolCall extends BaseEvent {
  type: "toolCall"
  toolName: string
  toolCallId: string
  arguments: string
}

export interface ToolCallResult extends BaseEvent {
  type: "toolCallResult"
  toolCallId: string
  toolName: string
  content: string
}

// Workflow State Events
export type WorkflowRunState = "running" | "completed" | "error"
export interface WorkflowState extends BaseEvent {
  type: "workflowState"
  state: WorkflowRunState
}

// Review Events
export interface ReviewComment extends BaseEvent {
  type: "reviewComment"
  content: string
  planId: string
}

export interface ErrorEvent extends BaseEvent {
  type: "error"
  content: string
}

// Plan
export type PlanStatus =
  | "pendingReview"
  | "approved"
  | "rejected"
  | "implemented"
export type Plan = {
  id: string
  content: string
  status: PlanStatus
  version: number
  editedAt?: Date
  editMessage?: string
}

// Union type for all event types
export type AnyEvent =
  | StatusEvent
  | SystemPrompt
  | UserMessage
  | LLMResponse
  | ToolCall
  | ToolCallResult
  | WorkflowState
  | ReviewComment
  | ErrorEvent

// Relationship Types

export type RelationshipTypes =
  // Repository Relationships
  | "HAS_ISSUES"
  | "HAS_PRS"
  | "OWNED_BY"
  // Issue Relationships
  | "BELONGS_TO"
  | "CREATED_BY"
  // Workflow run Relationships
  | "STARTS_WITH" // Links WorkflowRun to its first event
  | "BASED_ON_ISSUE" // Links WorkflowRun to its Issue
  | "LAUNCHED_BY" // Links WorkflowRun to the User that launched it
  // PullRequest Relationships
  | "RESOLVES"
  | "OPENED_BY"
  // Event Relationships
  | "NEXT" // Links events in chronological order
  | "REFERENCES" // Event referencing another node (Issue, PR, etc)
  | "COMMENTS_ON" // Review comments on plans
  // User Relationships
  | "OWNED_BY"
  | "DRAFTED_BY"
  | "POSTED"
  | "CREATED_BY"
  | "LAUNCHED_BY"
  // Plan Relationships
  | "NEXT_VERSION"
  | "IMPLEMENTS"
  | "DRAFTED_BY"

export type Relationship = {
  type: RelationshipTypes
  from: string // Node ID
  to: string // Node ID
  properties?: Record<string, unknown>
}
