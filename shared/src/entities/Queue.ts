import { z } from "zod"

export const WORKFLOW_JOBS_QUEUE = "workflow-jobs"

export const QueueEnum = z.enum([WORKFLOW_JOBS_QUEUE])
export type QueueEnum = z.infer<typeof QueueEnum>
