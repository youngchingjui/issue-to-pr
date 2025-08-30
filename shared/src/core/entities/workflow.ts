import { z } from "zod"

/**
 * Minimal event types needed for summarization. These are intentionally
 * decoupled from the app's internal event types to keep the shared package
 * independent and portable.
 */
export const workflowEventBaseSchema = z.object({
  createdAt: z.date(),
  content: z.string().optional(),
})

export const simpleEventTypeSchema = z.enum([
  "systemPrompt",
  "userMessage",
  "llmResponse",
  "reasoning",
  "status",
  "error",
  "reviewComment",
  "workflowState",
])

export const simpleEventSchema = workflowEventBaseSchema.extend({
  type: simpleEventTypeSchema,
  content: z.string(),
})

export const toolCallEventSchema = workflowEventBaseSchema.extend({
  type: z.literal("toolCall"),
  toolName: z.string(),
  args: z.string(), // JSON string of arguments
})

export const toolCallResultEventSchema = workflowEventBaseSchema.extend({
  type: z.literal("toolCallResult"),
  toolName: z.string(),
  content: z.string(),
})

export const workflowEventSchema = z.discriminatedUnion("type", [
  simpleEventSchema,
  toolCallEventSchema,
  toolCallResultEventSchema,
])

export type WorkflowEvent = z.infer<typeof workflowEventSchema>
export type ToolCallEvent = z.infer<typeof toolCallEventSchema>
export type ToolCallResultEvent = z.infer<typeof toolCallResultEventSchema>

// Structured summary output for a workflow run
export const workflowRunSummarySchema = z.object({
  workflowRunId: z.string(),
  actionsSummary: z
    .string()
    .describe(
      "High-level narrative of what the agent attempted, the steps it took, and the outcome."
    ),
  filesRead: z
    .array(z.string())
    .describe("List of file paths the agent read or inspected during the run."),
  interestingFindings: z
    .array(z.string())
    .describe(
      "Notable observations about the codebase that were important to the agent's reasoning."
    ),
})

export type WorkflowRunSummary = z.infer<typeof workflowRunSummarySchema>

