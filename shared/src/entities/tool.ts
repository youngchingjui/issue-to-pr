export type JsonPrimitive = string | number | boolean | null

export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue }

export interface JsonObject {
  [key: string]: JsonValue
}

/**
 * Minimal JSON Schema-like type for tool parameters.
 * We intentionally keep this loose to remain provider-agnostic and avoid
 * coupling entities to specific schema libraries.
 */
export type JsonSchemaLike = JsonObject

export interface Tool {
  /** Unique tool name used by agents and planners */
  name: string
  /** Short description of what the tool does */
  description?: string
  /** Optional JSON schema-like parameters for arguments */
  parameters?: JsonSchemaLike
}

/**
 * Invariants and validation helpers for ToolSpec.
 */
export function assertValidTool(tool: Tool): void {
  if (!tool) throw new Error("Tool must be provided")

  // name: 1..64 chars, alphanumeric, dash or underscore
  const name = tool.name
  if (typeof name !== "string" || name.length === 0) {
    throw new Error("Tool.name must be a non-empty string")
  }
  if (name.length > 64) {
    throw new Error("Tool.name must be <= 64 characters")
  }
  if (!/^[A-Za-z0-9_-]+$/.test(name)) {
    throw new Error(
      "Tool.name may only contain letters, numbers, hyphens, and underscores"
    )
  }

  // description: optional, max length to keep prompts concise
  if (
    typeof tool.description !== "undefined" &&
    (typeof tool.description !== "string" || tool.description.length > 1024)
  ) {
    throw new Error(
      "Tool.description must be a string of length <= 1024 when provided"
    )
  }

  // parameters: if present, must be a plain object (JSON-like)
  if (
    typeof tool.parameters !== "undefined" &&
    !isJsonObject(tool.parameters)
  ) {
    throw new Error("Tool.parameters must be a JSON-like object when provided")
  }
}

export function isJsonObject(value: unknown): value is JsonObject {
  if (value === null || typeof value !== "object") return false
  if (Array.isArray(value)) return false
  return true
}

export function isTool(value: unknown): value is Tool {
  if (!value || typeof value !== "object") return false
  const v = value as Partial<Tool>
  return typeof v.name === "string"
}

export const ToolSpecFactory = {
  create(params: {
    name: string
    description?: string
    parameters?: JsonSchemaLike
  }): Tool {
    const spec: Tool = {
      name: params.name,
      description: params.description,
      parameters: params.parameters,
    }
    assertValidTool(spec)
    return spec
  },
}

/**
 * Provider-agnostic function tool definition. Adapters can map this shape to
 * specific LLM provider formats (e.g., OpenAI, Anthropic) without entities
 * importing provider SDKs.
 */
export interface FunctionToolDefinition {
  type: "function"
  function: {
    name: string
    description?: string
    parameters?: JsonSchemaLike
  }
}

export function toFunctionToolDefinition(tool: Tool): FunctionToolDefinition {
  assertValidTool(tool)
  const def: FunctionToolDefinition = {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }
  return def
}
