import { ChatCompletionMessageParam } from "openai/resources/chat/completions"

export type EnhancedMessage = ChatCompletionMessageParam & {
  id?: string
  timestamp?: Date
}
