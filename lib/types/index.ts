import { zodFunction } from "openai/helpers/zod"
import { ChatModel } from "openai/resources"
import { z } from "zod"

// Other
export interface Tool<T extends z.ZodType, U = unknown> {
  tool: ReturnType<typeof zodFunction>
  parameters: T
  handler: (params: z.infer<T>, ...args: U[]) => Promise<string>
}

export type AgentConstructorParams = {
  model?: ChatModel
  systemPrompt?: string
  apiKey?: string
}

// Plans
export const planSchema = z.object({
  id: z.string(),
  content: z.string(),
  status: z.enum(["pendingReview", "approved", "rejected", "implemented"]),
  version: z.number(),
  editedAt: z.date().optional(),
  editMessage: z.string().optional(),
})

export const planMetaSchema = planSchema.omit({ content: true })

// Events
const eventTypes = z.enum([
  "status",
  "message",
  "toolCall",
  "toolCallResult",
  "workflowState",
  "reviewComment",
  "systemPrompt",
  "userMessage",
  "llmResponse",
])
const baseEventSchema = z.object({
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
    plan: planMetaSchema.optional(),
  })
)

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

export const toolCallSchema = baseEventSchema.extend({
  type: z.literal("toolCall"),
  toolName: z.string(),
  toolCallId: z.string(),
  arguments: z.string(),
})

export const toolCallResultSchema = baseEventSchema.extend({
  type: z.literal("toolCallResult"),
  toolCallId: z.string(),
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

// Type exports
export type Plan = z.infer<typeof planSchema>
export type PlanMeta = z.infer<typeof planMetaSchema>
export type EventTypes = z.infer<typeof eventTypes>
export type BaseEvent = z.infer<typeof baseEventSchema>
export type StatusEvent = z.infer<typeof statusEventSchema>
export type SystemPrompt = z.infer<typeof systemPromptSchema>
export type UserMessage = z.infer<typeof userMessageSchema>
export type ToolCall = z.infer<typeof toolCallSchema>
export type ToolCallResult = z.infer<typeof toolCallResultSchema>
export type WorkflowState = z.infer<typeof workflowStateSchema>
export type ReviewComment = z.infer<typeof reviewCommentSchema>
export type ErrorEvent = z.infer<typeof errorEventSchema>
export type AnyEvent = z.infer<typeof anyEventSchema>
export type LLMResponse = z.infer<typeof llmResponseSchema>
