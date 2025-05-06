import { z } from "zod"

import { WorkflowType } from "./neo4j"

// Base Event Schema
/**
 * @deprecated Use index.ts instead
 */
const baseEventSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  workflowId: z.string(),
  content: z.string().optional(),
  type: z.enum([
    "status",
    "message",
    "toolCall",
    "toolCallResult",
    "workflowState",
    "reviewComment",
    "systemPrompt",
    "userMessage",
    "llmResponse",
  ]),
})

// Specific Event Schemas
export const statusEventSchema = baseEventSchema.extend({
  type: z.literal("status"),
})

export const systemPromptSchema = baseEventSchema.extend({
  type: z.literal("systemPrompt"),
  content: z.string(),
})

export const userMessageSchema = baseEventSchema.extend({
  type: z.literal("userMessage"),
  content: z.string(),
})

/**
 * @deprecated Use index.ts instead
 */
export const llmResponseSchema = baseEventSchema.extend({
  type: z.literal("llmResponse"),
  content: z.string(),
})

export const toolCallSchema = baseEventSchema.extend({
  type: z.literal("toolCall"),
  toolName: z.string(),
  toolCallId: z.string().optional(),
  arguments: z.string(),
})

export const toolCallResultSchema = baseEventSchema.extend({
  type: z.literal("toolCallResult"),
  toolCallId: z.string().optional(),
  toolName: z.string(),
  content: z.string(),
})

export const workflowStateSchema = baseEventSchema.extend({
  type: z.literal("workflowState"),
  state: z.enum(["running", "completed", "error"]),
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

// Union of all event schemas
export const anyEventSchema = z.discriminatedUnion("type", [
  statusEventSchema,
  systemPromptSchema,
  userMessageSchema,
  llmResponseSchema,
  toolCallSchema,
  toolCallResultSchema,
  workflowStateSchema,
  reviewCommentSchema,
  errorEventSchema,
])

// WorkflowRun Schema
/**
 * @deprecated Use workflowRunSchema in /lib/types/index.ts instead
 */
export const workflowRunSchema = z.object({
  id: z.string(),
  workflowType: z.enum([
    "commentOnIssue",
    "resolveIssue",
    "identifyPRGoal",
    "reviewPullRequest",
  ] as const satisfies readonly WorkflowType[]),
  created_at: z.date(),
})

// Issue Schema
/**
 * @deprecated Use issueSchema in /lib/types/index.ts instead
 */
export const issueSchema = z.object({
  number: z.number(),
  id: z.string().optional(),
  createdAt: z.date().optional(),
  repoFullName: z.string(),
  title: z.string().optional(),
  body: z.string().optional(),
  state: z.enum(["open", "closed"]).optional(),
  labels: z.array(z.string()).optional(),
  assignees: z.array(z.string()).optional(),
  updatedAt: z.date().optional(),
})
