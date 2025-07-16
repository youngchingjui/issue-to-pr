import { LLMResponse as LLMResponseNew, WorkflowType } from "@/lib/types"

// Core Entity Types
// TODO: Use zod to create schemas, then export types from schemas
// TODO: Define baseline application-level schemas, then extend database schemas from there
// TODO: move this file to /types/db/neo4j.ts

export type User = {
  id: string // Maps to PostgreSQL users.id
  displayName: string // Cached display name for convenient querying
}

/**
 * @deprecated Use the Zod schema and inferred type from lib/types/index.ts instead.
 */
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

/**
 * @deprecated Use the Zod schema and inferred type from lib/types/index.ts instead.
 */
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

/**
 * @deprecated Use the Zod schema and inferred type from lib/types/index.ts instead.
 */
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
/**
 * @deprecated Use the Zod schema and inferred type from lib/types/index.ts instead.
 */
export interface BaseEvent {
  id: string
  createdAt: Date
  workflowId: string
  content?: string
  type: EventType
}

// Basic Event
/**
 * @deprecated Use the Zod schema and inferred type from lib/types/index.ts instead.
 */
export interface StatusEvent extends BaseEvent {
  type: "status"
}

// Message Events
/**
 * @deprecated Use the Zod schema and inferred type from lib/types/index.ts instead.
 */
export interface SystemPrompt extends BaseEvent {
  type: "systemPrompt"
  content: string
}

/**
 * @deprecated Use the Zod schema and inferred type from lib/types/index.ts instead.
 */
export interface UserMessage extends BaseEvent {
  type: "userMessage"
  content: string
}

/**
 * @deprecated Use the Zod schema and inferred type from lib/types/index.ts instead.
 */
export interface LLMResponse extends BaseEvent {
  type: "llmResponse"
  content: string
}

// Tool Events
/**
 * @deprecated Use the Zod schema and inferred type from lib/types/index.ts instead.
 */
export interface ToolCall extends BaseEvent {
  type: "toolCall"
  toolName: string
  toolCallId: string
  arguments: string
}

/**
 * @deprecated Use the Zod schema and inferred type from lib/types/index.ts instead.
 */
export interface ToolCallResult extends BaseEvent {
  type: "toolCallResult"
  toolCallId: string
  toolName: string
  content: string
}

// Workflow State Events
/**
 * @deprecated Use the Zod schema and inferred type from lib/types/index.ts instead.
 */
export type WorkflowRunState = "running" | "completed" | "error"
/**
 * @deprecated Use the Zod schema and inferred type from lib/types/index.ts instead.
 */
export interface WorkflowState extends BaseEvent {
  type: "workflowState"
  state: WorkflowRunState
}

// Review Events
/**
 * @deprecated Use the Zod schema and inferred type from lib/types/index.ts instead.
 */
export interface ReviewComment extends BaseEvent {
  type: "reviewComment"
  content: string
  planId: string
}

/**
 * @deprecated Use the Zod schema and inferred type from lib/types/index.ts instead.
 */
export interface ErrorEvent extends BaseEvent {
  type: "error"
  content: string
}

// Plan
/**
 * @deprecated Use index.ts instead
 */
export type PlanStatus =
  | "pendingReview"
  | "approved"
  | "rejected"
  | "implemented"

/**
 * @deprecated Use index.ts instead
 */
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
  | ToolCall
  | ToolCallResult
  | WorkflowState
  | ReviewComment
  | ErrorEvent
  | LLMResponseNew

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
