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

export type WorkflowRun = {
  id: string
  workflowType: WorkflowType
  startedAt: Date
  completedAt?: Date
  status: "running" | "completed" | "failed"
  result?: string
  metadata: Record<string, unknown> // Additional run-specific data
}

// Message Types

export type MessageRole =
  | "user"
  | "system"
  | "assistant"
  | "tool_call"
  | "tool_result"

export type BaseMessage = {
  id: string
  content: string
  timestamp: Date
  role: MessageRole
  metadata: Record<string, unknown>
}

export type ToolCall = {
  role: "tool_call"
  metadata: {
    toolName: string
    status: "initiated" | "executing" | "completed" | "failed"
    parameters: Record<string, unknown>
  }
}

export type ToolResult = {
  role: "tool_result"
  metadata: {
    toolName: string
    isError: boolean
    errorMessage?: string
  }
}

export type Plan = {
  status: "pending_review" | "approved" | "rejected" | "implemented"
  version: number
  editedAt?: Date
  editMessage?: string
}

export type ReviewComment = {
  role: "user"
  metadata: {
    userId: string
    reviewContext: Record<string, unknown>
  }
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
  | "HAS_RUNS"
  // PullRequest Relationships
  | "RESOLVES"
  | "GENERATED_BY"
  // Message Relationships
  | "NEXT"
  | "PART_OF"
  | "COMMENTS_ON"
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
