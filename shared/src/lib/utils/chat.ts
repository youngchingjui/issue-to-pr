import { type FunctionTool } from "openai/resources/responses/responses"
import { ZodType } from "zod"

import { type Tool } from "@/shared/lib/types"

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
