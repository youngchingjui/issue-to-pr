import { type ChatCompletionMessageParam } from "openai/resources/chat/completions"
import { z } from "zod"

export const ChatCompletionMessageParamSchema: z.ZodType<ChatCompletionMessageParam> =
  z.custom<ChatCompletionMessageParam>()

export type EnhancedMessage = ChatCompletionMessageParam & {
  id?: string
  timestamp?: Date
}
