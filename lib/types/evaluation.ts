import { z } from "zod"


export const PlanEvaluationRequestSchema = z.object({
  plan: z.string().min(1),
})
export type PlanEvaluationRequest = z.infer<typeof PlanEvaluationRequestSchema>
