import { z } from "zod"

export const JobStatusEnum = z.enum([
  "Queued",
  "Running",
  "Completed",
  "Failed",
])
export type JobStatusEnum = z.infer<typeof JobStatusEnum>

export const JobStatusUpdateSchema = z.object({
  jobId: z.string().min(1),
  status: JobStatusEnum.or(z.string()), // keep flexible if producers send rich text
})

export type JobStatusUpdate = z.infer<typeof JobStatusUpdateSchema>
