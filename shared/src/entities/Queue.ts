import { z } from "zod"

// TODO: Consider, does this belong in Channels.ts instead?
// Or should this be closer to the neo4j adapters?
export const WORKFLOW_JOBS_QUEUE = "workflow-jobs"

export const QueueEnum = z.enum([WORKFLOW_JOBS_QUEUE])
export type QueueEnum = z.infer<typeof QueueEnum>
