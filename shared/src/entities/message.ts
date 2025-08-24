export type MessageRole = "user" | "assistant" | "tool"

export interface BaseMessage {
  content: string
}

export interface UserMessage extends BaseMessage {
  role: "user"
}

export interface AssistantMessage extends BaseMessage {
  role: "assistant"
}

export interface ToolMessage extends BaseMessage {
  role: "tool"
  /** Name of the tool that produced this message */
  name: string
}

export type Message = UserMessage | AssistantMessage | ToolMessage

/**
 * Invariants and validation helpers for the Message entity.
 * Enforces minimal domain rules without importing adapters or ports.
 */
export function assertValidMessage(message: Message): void {
  if (!message) throw new Error("Message must be provided")
  if (typeof message.content !== "string" || message.content.length === 0) {
    throw new Error("Message.content must be a non-empty string")
  }
  switch (message.role) {
    case "user":
    case "assistant":
      return
    case "tool":
      if (!message.name || typeof message.name !== "string") {
        throw new Error("ToolMessage.name must be a non-empty string")
      }
      return
  }
}

/** Factory functions for constructing valid messages */
export const MessageFactory = {
  user(content: string): UserMessage {
    const message: UserMessage = { role: "user", content }
    assertValidMessage(message)
    return message
  },
  assistant(content: string): AssistantMessage {
    const message: AssistantMessage = { role: "assistant", content }
    assertValidMessage(message)
    return message
  },
  tool(name: string, content: string): ToolMessage {
    const message: ToolMessage = { role: "tool", name, content }
    assertValidMessage(message)
    return message
  },
}

/** Type guards */
export function isUserMessage(m: Message): m is UserMessage {
  return m.role === "user"
}
export function isAssistantMessage(m: Message): m is AssistantMessage {
  return m.role === "assistant"
}
export function isToolMessage(m: Message): m is ToolMessage {
  return m.role === "tool"
}

/**
 * Normalization helpers:
 * - foldToolAsAssistant: represent a tool output as an assistant-visible text
 *   so simple LLM ports can consume it without special tool-message handling.
 */
export function foldToolAsAssistant(
  m: Message
): UserMessage | AssistantMessage {
  if (isToolMessage(m)) {
    return {
      role: "assistant",
      content: `[Tool ${m.name} result]:\n${m.content}`,
    }
  }
  return m
}

/**
 * Map a conversation to a minimal plain representation expected by simple LLM ports.
 * Tools are folded into assistant messages.
 */
export function toPlainConversation(messages: Message[]): {
  messages: Array<{ role: "user" | "assistant"; content: string }>
} {
  const plain = messages.map((m) => foldToolAsAssistant(m))
  return {
    messages: plain.map((m) => ({ role: m.role, content: m.content })),
  }
}
