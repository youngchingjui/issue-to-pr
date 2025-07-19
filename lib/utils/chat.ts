import { ChatCompletionMessageParam } from "openai/resources/chat/completions"
import { ResponseInput } from "openai/resources/responses/responses"
import { FunctionTool } from "openai/resources/responses/responses"
import { ZodType } from "zod"

import { Tool } from "@/lib/types"
import { EnhancedMessage } from "@/lib/types/chat"

/**
 * Converts a ChatCompletionMessageParam or EnhancedMessage to the format suitable for OpenAI's Responses API.
 *
 * This helper function transforms individual chat messages from the Chat Completions API format
 * to the ResponseInput format required by the Responses API. It handles the mapping of different
 * message roles and content types.
 *
 * @param message - The chat message to convert (ChatCompletionMessageParam or EnhancedMessage)
 * @returns An array of ResponseInput items (may be empty for unsupported message types)
 */
export function convertMessageToResponseInput(
  message: ChatCompletionMessageParam | EnhancedMessage
): ResponseInput {
  if (message.role === "system" || message.role === "developer") {
    return [
      {
        role: "developer" as const,
        content: [
          { type: "input_text" as const, text: message.content as string },
        ],
      },
    ]
  } else if (message.role === "user") {
    return [
      {
        role: "user" as const,
        content: [
          { type: "input_text" as const, text: message.content as string },
        ],
      },
    ]
  } else if (message.role === "assistant") {
    return [
      {
        role: "assistant" as const,
        content: [
          { type: "input_text" as const, text: message.content as string },
        ],
      },
    ]
  } else if (message.role === "tool") {
    return [
      {
        type: "function_call_output" as const,
        call_id: message.tool_call_id as string,
        output: message.content as string,
      },
    ]
  }

  // Skip any messages we can't convert (returns empty array)
  return []
}

/**
 * Converts an array of ChatCompletionMessageParam or EnhancedMessage to ResponseInput format.
 *
 * This is a convenience function that processes multiple messages at once using flatMap
 * to convert and flatten the results into a single ResponseInput array.
 *
 * @param messages - Array of chat messages to convert
 * @returns ResponseInput array suitable for the OpenAI Responses API
 */
export function convertMessagesToResponseInput(
  messages: (ChatCompletionMessageParam | EnhancedMessage)[]
): ResponseInput {
  return messages.flatMap(convertMessageToResponseInput)
}

/**
 * Converts a custom Tool interface to OpenAI's FunctionTool format.
 *
 * This utility function transforms your internal Tool interface (which includes
 * schema and handler) to the FunctionTool format expected by OpenAI's API.
 * It extracts the function definition and handles type compatibility.
 *
 * @param tool - The custom Tool to convert
 * @returns FunctionTool object suitable for OpenAI API calls
 */
export function convertToolToFunctionTool<Schema extends ZodType, Output>(
  tool: Tool<Schema, Output>
): FunctionTool {
  return {
    name: tool.function.name,
    parameters: tool.function.parameters,
    description: tool.function.description,
    type: "function",
    strict: null, // Default to null as per OpenAI's FunctionTool interface
  }
}
