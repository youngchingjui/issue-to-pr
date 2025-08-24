import { z } from "zod"

// GET /api/issues/[issueId]/pullRequest
export const getLinkedPrParamsSchema = z.object({
  issueId: z
    .string()
    .regex(/^\d+$/u, { message: "issueId must be a number" })
    .transform((v) => Number.parseInt(v, 10)),
})

export const getLinkedPrQuerySchema = z.object({
  repo: z.string().min(1, { message: "repo is required" }),
})

export const getLinkedPrResponseSchema = z.object({
  prNumber: z.number().int().nullable(),
})
