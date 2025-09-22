import { z } from "zod"

/**
 * Unified workflow event definition using Zod.
 * - Transport-agnostic base (safe to persist/stream)
 * - Narrow, discriminated event variants for type inference
 */

// Common fields shared by all workflow events
const BaseFields = z.object({
  id: z.string(),
  timestamp: z.date(), // ISO timestamp
})

// workflow.started — required content
export const WorkflowStartedEventSchema = BaseFields.extend({
  type: z.literal("workflow.started"),
  content: z.string().optional(),
})
export type WorkflowStartedEvent = z.infer<typeof WorkflowStartedEventSchema>

// workflow.completed — optional content
export const WorkflowCompletedEventSchema = BaseFields.extend({
  type: z.literal("workflow.completed"),
  content: z.string().optional(),
})
export type WorkflowCompletedEvent = z.infer<
  typeof WorkflowCompletedEventSchema
>

// workflow.error — required content
export const WorkflowErrorEventSchema = BaseFields.extend({
  type: z.literal("workflow.error"),
  message: z.string(),
})
export type WorkflowErrorEvent = z.infer<typeof WorkflowErrorEventSchema>

export const WorkflowCancelledEventSchema = BaseFields.extend({
  type: z.literal("workflow.cancelled"),
  content: z.string().optional(),
})
export type WorkflowCancelledEvent = z.infer<
  typeof WorkflowCancelledEventSchema
>

// workflow.state — For delineating current state of workflow.
export const WorkflowStateEventSchema = BaseFields.extend({
  type: z.literal("workflow.state"),
  content: z.string().optional(),
  state: z.enum(["running", "completed", "error", "timedOut"]),
})
export type WorkflowStateEvent = z.infer<typeof WorkflowStateEventSchema>

// status — UI-facing status of workflow.
export const WorkflowStatusEventSchema = BaseFields.extend({
  type: z.literal("status"),
  content: z.string(),
})
export type WorkflowStatusEvent = z.infer<typeof WorkflowStatusEventSchema>

// issue.fetched — optional content/metadata
export const IssueFetchedEventSchema = BaseFields.extend({
  type: z.literal("issue.fetched"),
  content: z.string().optional(),
})
export type IssueFetchedEvent = z.infer<typeof IssueFetchedEventSchema>

export const WorkflowCheckpointSavedEventSchema = BaseFields.extend({
  type: z.literal("workflow.checkpoint.saved"),
  content: z.string().optional(),
})
export type WorkflowCheckpointSavedEvent = z.infer<
  typeof WorkflowCheckpointSavedEventSchema
>

export const WorkflowCheckpointRestoredEventSchema = BaseFields.extend({
  type: z.literal("workflow.checkpoint.restored"),
  content: z.string().optional(),
})
export type WorkflowCheckpointRestoredEvent = z.infer<
  typeof WorkflowCheckpointRestoredEventSchema
>

/*
 *  TODO: Also can consider the following workflow events in future:
 *  - phase.started
 *  - phase.completed
 *  - phase.skipped
 *  - phase.error
 *  - step.started
 *  - step.completed
 *  - step.error
 *  - metrics.progress (0-1 or percent)
 *  - metrics.timing (named timers)
 *  - metrics.cost(token cost)
 */
export const WorkflowEventSchema = z.discriminatedUnion("type", [
  WorkflowStartedEventSchema,
  WorkflowCompletedEventSchema,
  WorkflowErrorEventSchema,
  WorkflowStateEventSchema,
  WorkflowStatusEventSchema,
  WorkflowCancelledEventSchema,
  IssueFetchedEventSchema,
  WorkflowCheckpointSavedEventSchema,
  WorkflowCheckpointRestoredEventSchema,
])

export type WorkflowEvent = z.infer<typeof WorkflowEventSchema>
export type WorkflowEventType = WorkflowEvent["type"]

export const isWorkflowEvent = (value: unknown): value is WorkflowEvent => {
  const res = WorkflowEventSchema.safeParse(value)
  return res.success
}
