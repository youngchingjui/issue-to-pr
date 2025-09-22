import { z } from "zod"

// Common fields shared by all events
const BaseFields = z.object({
  id: z.string(),
  timestamp: z.string().datetime(), // ISO timestamp
})

export const LlmStartedEventSchema = BaseFields.extend({
  type: z.literal("llm.started"),
  content: z.string().optional(),
})
export type LlmStartedEvent = z.infer<typeof LlmStartedEventSchema>

export const LlmCompletedEventSchema = BaseFields.extend({
  type: z.literal("llm.completed"),
  content: z.string().optional(),
})
export type LLMCompletedEvent = z.infer<typeof LlmCompletedEventSchema>

export const LLMEventSchema = z.discriminatedUnion("type", [
  LlmStartedEventSchema,
  LlmCompletedEventSchema,
])
export type LLMEvent = z.infer<typeof LLMEventSchema>
export type LLMEventType = LLMEvent["type"]
