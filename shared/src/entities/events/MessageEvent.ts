/**
 * Message event types represent conversational messages exchanged in a workflow.
 * Separate from WorkflowEvent (status, tool, state changes, etc.).
 */

import { z } from "zod"

export const MessageEventTypeEnum = z.enum([
  "system_prompt",
  "developer_prompt",
  "user_message",
  "assistant_message",
  "tool_call",
  "tool_call_result",
  "reasoning",
])
export type MessageEventType = z.infer<typeof MessageEventTypeEnum>

const MetadataSchema = z.record(z.unknown()).optional()
type Metadata = z.infer<typeof MetadataSchema>

// TODO: Expand this definition to be an object that can incorporate many things.
// Like text, image URLs. Also should include more metadata like role, etc.
const ContentSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text"),
    text: z.string(),
  }),
  z.object({
    type: z.literal("image"),
    image_url: z.string(),
  }),
  z.object({
    type: z.literal("file"),
    file_url: z.string(),
  }),
  z.object({
    type: z.literal("audio"),
    audio: z.object({
      data: z.string(),
      format: z.enum(["mp3", "wav"]),
    }),
  }),
])
type Content = z.infer<typeof ContentSchema>

const BaseMessageEventSchema = z.object({
  type: MessageEventTypeEnum,
  content: ContentSchema,
  metadata: MetadataSchema,
})
type BaseMessageEvent = z.infer<typeof BaseMessageEventSchema>

export const SystemPromptEventSchema = BaseMessageEventSchema.extend({
  type: z.literal("system_prompt"),
})
export type SystemPromptEvent = z.infer<typeof SystemPromptEventSchema>

export const UserMessageEventSchema = BaseMessageEventSchema.extend({
  type: z.literal("user_message"),
})
export type UserMessageEvent = z.infer<typeof UserMessageEventSchema>

export const AssistantMessageEventSchema = BaseMessageEventSchema.extend({
  type: z.literal("assistant_message"),
})
export type AssistantMessageEvent = z.infer<typeof AssistantMessageEventSchema>

export const ToolCallEventSchema = BaseMessageEventSchema.extend({
  type: z.literal("tool_call"),
})
export type ToolCallEvent = z.infer<typeof ToolCallEventSchema>

export const ToolCallResultEventSchema = BaseMessageEventSchema.extend({
  type: z.literal("tool_call_result"),
})
export type ToolCallResultEvent = z.infer<typeof ToolCallResultEventSchema>

export const ReasoningEventSchema = BaseMessageEventSchema.extend({
  type: z.literal("reasoning"),
})
export type ReasoningEvent = z.infer<typeof ReasoningEventSchema>

export const MessageEventSchema = z.discriminatedUnion("type", [
  SystemPromptEventSchema,
  UserMessageEventSchema,
  AssistantMessageEventSchema,
  ToolCallEventSchema,
  ToolCallResultEventSchema,
  ReasoningEventSchema,
])

export type MessageEvent = z.infer<typeof MessageEventSchema>
