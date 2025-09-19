import { z } from "zod"

/**
 * Transport-level event contracts used when publishing to and consuming from
 * the event bus (e.g., Redis Streams). These schemas are intentionally kept
 * small and serializable, and are safe to use across adapters and use cases.
 *
 * They complement the domain event types in `MessageEvent` and `WorkflowEvent`
 * by providing a concrete, validated wire format. Both publisher and consumer
 * should use these schemas to validate payloads at the boundary.
 */

export const MetadataSchema = z.record(z.unknown()).optional()

const BaseWithOptionalTimestamp = z.object({
  /** ISO-8601 timestamp; when missing, adapters should set it on write. */
  timestamp: z.string().datetime().optional(),
})

// Message events
export const SystemPromptEventSchema = BaseWithOptionalTimestamp.extend({
  type: z.literal("system_prompt"),
  content: z.string(),
  metadata: MetadataSchema,
})

export const UserMessageEventSchema = BaseWithOptionalTimestamp.extend({
  type: z.literal("user_message"),
  content: z.string(),
  metadata: MetadataSchema,
})

export const AssistantMessageEventSchema = BaseWithOptionalTimestamp.extend({
  type: z.literal("assistant_message"),
  content: z.string(),
  model: z.string().optional(),
  metadata: MetadataSchema,
})

export const ToolCallEventSchema = BaseWithOptionalTimestamp.extend({
  type: z.literal("tool_call"),
  toolName: z.string(),
  toolCallId: z.string(),
  // Keep as string to avoid oversized payloads; producers may JSON.stringify
  // opaque args objects prior to publishing.
  args: z.string(),
  metadata: MetadataSchema,
})

export const ToolCallResultEventSchema = BaseWithOptionalTimestamp.extend({
  type: z.literal("tool_call_result"),
  toolName: z.string(),
  toolCallId: z.string(),
  content: z.string(),
  metadata: MetadataSchema,
})

export const ReasoningEventSchema = BaseWithOptionalTimestamp.extend({
  type: z.literal("reasoning"),
  summary: z.string(),
  metadata: MetadataSchema,
})

// Workflow/status/LLM events
export const StatusEventSchema = BaseWithOptionalTimestamp.extend({
  type: z.literal("status"),
  content: z.string(),
  metadata: MetadataSchema,
})

export const LlmStartedEventSchema = BaseWithOptionalTimestamp.extend({
  type: z.literal("llm.started"),
  content: z.string().optional(),
  metadata: MetadataSchema,
})

export const LlmCompletedEventSchema = BaseWithOptionalTimestamp.extend({
  type: z.literal("llm.completed"),
  content: z.string().optional(),
  metadata: MetadataSchema,
})

export const StreamEventSchema = z.discriminatedUnion("type", [
  SystemPromptEventSchema,
  UserMessageEventSchema,
  AssistantMessageEventSchema,
  ToolCallEventSchema,
  ToolCallResultEventSchema,
  ReasoningEventSchema,
  StatusEventSchema,
  LlmStartedEventSchema,
  LlmCompletedEventSchema,
])

export type StreamEvent = z.infer<typeof StreamEventSchema>

/** Ensure an event has a timestamp; returns a new object when added. */
export function ensureTimestamp<T extends { timestamp?: string }>(
  event: T,
  now: () => string = () => new Date().toISOString()
): T & { timestamp: string } {
  if (event.timestamp && typeof event.timestamp === "string")
    return event as T & {
      timestamp: string
    }
  return { ...(event as Record<string, unknown>), timestamp: now() } as T & {
    timestamp: string
  }
}

/** Parse unknown payload into a validated StreamEvent. Throws on failure. */
export function parseStreamEvent(payload: unknown): StreamEvent {
  const parsed = StreamEventSchema.parse(payload)
  return parsed
}

/** Safe-parse variant returning null when invalid. */
export function tryParseStreamEvent(payload: unknown): StreamEvent | null {
  const res = StreamEventSchema.safeParse(payload)
  return res.success ? res.data : null
}
