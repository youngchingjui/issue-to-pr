import { z } from "zod"

export const PlanEvaluationSchema = z.object({
  noTypeCasting: z.boolean(),
  noAnyTypes: z.boolean(),
  noSingleItemHelper: z.boolean(),
})

export type PlanEvaluationResult = z.infer<typeof PlanEvaluationSchema>

export const PlanEvaluationRequestSchema = z.object({
  plan: z.string().min(1),
})
export type PlanEvaluationRequest = z.infer<typeof PlanEvaluationRequestSchema>
