// Core Entity Types

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

export type WorkflowRunStatus = "running" | "completed" | "error"
export type WorkflowRun = {
  id: string
  workflowType: WorkflowType
  created_at: Date
  result?: string
}

// Event Types

// Base Event properties that all events will have
export type Event = {
  id: string
  timestamp: Date
  metadata?: Record<string, unknown>
}

// Message Events (:Event:Message)
export type MessageRole = "user" | "system" | "assistant"
export type Message = Event & {
  content: string
  role: MessageRole
}

// Tool Events (:Event:ToolCall and :Event:ToolResult)
export type ToolCall = Event & {
  toolName: string
  parameters: Record<string, unknown>
}

export type ToolCallResult = Event & {
  toolName: string
  result: string
  isError: boolean
  errorMessage?: string
}

// Workflow Status Events (:Event:WorkflowStatus)
export type WorkflowStatusEvent = Event & {
  workflowId: string
  status: WorkflowRunStatus
  details?: string
}

// Workspace Events (:Event:WorkspaceInit)
export type Status = Event & {
  message: string
}

// Plan
type PlanStatus = "pending_review" | "approved" | "rejected" | "implemented"
export type Plan = {
  content: string
  status: PlanStatus
  version: number
  editedAt?: Date
  editMessage?: string
}

// Review Events (:Event:Review)
export type ReviewComment = Event & {
  content: string
  planId: string
}

// Relationship Types

export type RelationshipTypes =
  // Repository Relationships
  | "HAS_ISSUES"
  | "HAS_PRS"
  | "OWNED_BY"
  // Issue Relationships
  | "BELONGS_TO"
  | "CREATED_BY"
  | "HAS_COMMENTS"
  // Workflow run Relationships
  | "STARTS_WITH" // Links WorkflowRun to its first event
  // PullRequest Relationships
  | "RESOLVES"
  | "GENERATED_BY"
  // Event Relationships
  | "NEXT" // Links events in chronological order
  | "REFERENCES" // Event referencing another node (Issue, PR, etc)
  | "COMMENTS_ON" // Review comments on plans
  // User Relationships
  | "HAS_ACCESS_TO"
  | "AUTHORIZED_FOR"
  | "OWNS"
  | "EDITED_BY"
  | "REVIEWS"
  | "APPROVES"
  | "REJECTS"
  // Plan Relationships
  | "PREVIOUS_VERSION"
  | "IMPLEMENTS"
  | "RESULTS_IN"

export type Relationship = {
  type: RelationshipTypes
  from: string // Node ID
  to: string // Node ID
  properties?: Record<string, unknown>
}
