import { z } from "zod"

import {
  toolCallEventSchema,
  toolCallResultEventSchema,
  workflowEventSchema,
} from "@/shared/src/core/entities/workflow"

// Re-export schemas for consumers
export { workflowEventSchema } from "@/shared/src/core/entities/workflow"

export type WorkflowEvent = z.infer<typeof workflowEventSchema>
export type ToolCallEvent = z.infer<typeof toolCallEventSchema>
export type ToolCallResultEvent = z.infer<typeof toolCallResultEventSchema>

/**
 * Port for retrieving workflow run data (events/messages) from any source
 * (database, API, etc.).
 */
export interface WorkflowRunPort {
  getEvents(workflowRunId: string): Promise<WorkflowEvent[]>
}

