import { z } from "zod"

/**
 * Unified workflow event definition using Zod.
 * - Transport-agnostic base (safe to persist/stream)
 * - Narrow, discriminated event variants for type inference
 */

// Common fields shared by all workflow events
const BaseFields = {
  timestamp: z.string().datetime(), // ISO timestamp
}

// Generic catch-all metadata type
const Metadata = z.record(z.unknown())

// workflow.started — required content
const WorkflowStartedEventSchema = z.object({
  type: z.literal("workflow.started"),
  ...BaseFields,
  content: z.string(),
  metadata: Metadata.optional(),
})

// workflow.completed — optional content
const WorkflowCompletedEventSchema = z.object({
  type: z.literal("workflow.completed"),
  ...BaseFields,
  content: z.string().optional(),
  metadata: Metadata.optional(),
})

// workflow.error — required content
const WorkflowErrorEventSchema = z.object({
  type: z.literal("workflow.error"),
  ...BaseFields,
  content: z.string(),
  metadata: Metadata.optional(),
})

// workflow.state — requires state metadata, allow extra keys
const WorkflowStateEventSchema = z.object({
  type: z.literal("workflow.state"),
  ...BaseFields,
  content: z.string().optional(),
  metadata: z
    .object({
      state: z.enum(["running", "completed", "error", "timedOut"]),
    })
    .passthrough()
    .optional(),
})

// status — required content
const StatusEventSchema = z.object({
  type: z.literal("status"),
  ...BaseFields,
  content: z.string(),
  metadata: Metadata.optional(),
})

// issue.fetched — optional content/metadata
const IssueFetchedEventSchema = z.object({
  type: z.literal("issue.fetched"),
  ...BaseFields,
  content: z.string().optional(),
  metadata: Metadata.optional(),
})

// llm.started — optional content/metadata
const LlmStartedEventSchema = z.object({
  type: z.literal("llm.started"),
  ...BaseFields,
  content: z.string().optional(),
  metadata: Metadata.optional(),
})

// llm.completed — optional content/metadata
const LlmCompletedEventSchema = z.object({
  type: z.literal("llm.completed"),
  ...BaseFields,
  content: z.string().optional(),
  metadata: Metadata.optional(),
})

// tool.call — requires metadata toolName/toolCallId/args (args can be any serializable)
const ToolCallEventSchema = z.object({
  type: z.literal("tool.call"),
  ...BaseFields,
  content: z.string().optional(),
  metadata: z.object({
    toolName: z.string(),
    toolCallId: z.string(),
    args: z.unknown().optional(),
  }),
})

// tool.result — requires content and metadata toolName/toolCallId
const ToolResultEventSchema = z.object({
  type: z.literal("tool.result"),
  ...BaseFields,
  content: z.string(),
  metadata: z.object({
    toolName: z.string(),
    toolCallId: z.string(),
  }),
})

// reasoning — required content (summary). metadata may optionally carry summary as well.
const ReasoningEventSchema = z.object({
  type: z.literal("reasoning"),
  ...BaseFields,
  content: z.string(),
  metadata: Metadata.optional(),
})

export const WorkflowEventSchema = z.discriminatedUnion("type", [
  WorkflowStartedEventSchema,
  WorkflowCompletedEventSchema,
  WorkflowErrorEventSchema,
  WorkflowStateEventSchema,
  StatusEventSchema,
  IssueFetchedEventSchema,
  LlmStartedEventSchema,
  LlmCompletedEventSchema,
  ToolCallEventSchema,
  ToolResultEventSchema,
  ReasoningEventSchema,
])

export type WorkflowEvent = z.infer<typeof WorkflowEventSchema>
export type WorkflowEventType = WorkflowEvent["type"]

// Backwards-compatible minimal interface for generic usage in existing code
// (Kept to avoid leaking Zod in call sites that only need TS types.)
/**
 * Minimal workflow event representation for cross-layer communication.
 * Avoids leaking domain internals; safe to persist/stream.
 */
export interface MinimalWorkflowEvent {
  type: WorkflowEventType
  timestamp: string
  content?: string
  metadata?: Record<string, unknown>
}

export const isWorkflowEvent = (value: unknown): value is WorkflowEvent => {
  const res = WorkflowEventSchema.safeParse(value)
  return res.success
}

