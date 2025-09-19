/**
 * Message types represent messages between any combination of user and AI assistants.
 */

import { z } from "zod"

export const MessageTypeEnum = z.enum([
  "system_prompt",
  "developer_prompt",
  "user_message",
  "assistant_message",
  "tool_call",
  "tool_call_result",
  "reasoning",
])
export type MessageType = z.infer<typeof MessageTypeEnum>

const MetadataSchema = z.record(z.unknown()).optional()
type Metadata = z.infer<typeof MetadataSchema>

// TODO: Expand this definition to be an object that can incorporate many things.
// Like text, image URLs. Also should include more metadata like role, etc.
const ContentSchema = z.union([
  z.string(),
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

const BaseMessageSchema = z.object({
  id: z.string(),
  workflowId: z.string().optional(),
  timestamp: z.string().datetime(),
  type: MessageTypeEnum,
  content: ContentSchema,
  metadata: MetadataSchema,
})
type BaseMessage = z.infer<typeof BaseMessageSchema>

export const SystemPromptSchema = BaseMessageSchema.extend({
  type: z.literal("system_prompt"),
})
export type SystemPrompt = z.infer<typeof SystemPromptSchema>

export const UserMessageSchema = BaseMessageSchema.extend({
  type: z.literal("user_message"),
})
export type UserMessage = z.infer<typeof UserMessageSchema>

export const AssistantMessageSchema = BaseMessageSchema.extend({
  type: z.literal("assistant_message"),
})
export type AssistantMessage = z.infer<typeof AssistantMessageSchema>

export const ToolCallSchema = BaseMessageSchema.extend({
  type: z.literal("tool_call"),
})
export type ToolCall = z.infer<typeof ToolCallSchema>

export const ToolCallResultSchema = BaseMessageSchema.extend({
  type: z.literal("tool_call_result"),
})
export type ToolCallResult = z.infer<typeof ToolCallResultSchema>

export const ReasoningSchema = BaseMessageSchema.extend({
  type: z.literal("reasoning"),
})
export type Reasoning = z.infer<typeof ReasoningSchema>

export const MessageSchema = z.discriminatedUnion("type", [
  SystemPromptSchema,
  UserMessageSchema,
  AssistantMessageSchema,
  ToolCallSchema,
  ToolCallResultSchema,
  ReasoningSchema,
])

export type Message = z.infer<typeof MessageSchema>
