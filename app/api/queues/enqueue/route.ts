import { NextRequest, NextResponse } from "next/server"
import {
  AutoResolveIssueJobData,
  CommentOnIssueJobData,
  ResolveIssueJobData,
} from "shared"
import { z } from "zod"

import {
  enqueueAutoResolveIssue,
  enqueueCommentOnIssue,
  enqueueResolveIssue,
  QUEUE_NAMES,
} from "@/lib/queues/client"

export const EnqueueRequestSchema = z.object({
  queueName: z.enum([
    QUEUE_NAMES.RESOLVE_ISSUE,
    QUEUE_NAMES.COMMENT_ON_ISSUE,
    QUEUE_NAMES.AUTO_RESOLVE_ISSUE,
  ]),
  data: z.union([
    z
      .object({
        issueNumber: z.number(),
        repoFullName: z.string(),
        jobId: z.string(),
        createPR: z.boolean(),
      })
      .transform((data) => data),
    z
      .object({
        issueNumber: z.number(),
        repoFullName: z.string(),
        jobId: z.string(),
        postToGithub: z.boolean(),
      })
      .transform((data) => data),
    z
      .object({
        issueNumber: z.number(),
        repoFullName: z.string(),
        jobId: z.string(),
      })
      .transform((data) => data),
  ]),
})

export const EnqueueResponseSchema = z.object({
  jobId: z.string(),
})

export const EnqueueErrorResponseSchema = z.object({
  error: z.string(),
  details: z.any().optional(),
})

export type EnqueueRequest = z.infer<typeof EnqueueRequestSchema>
export type EnqueueResponse = z.infer<typeof EnqueueResponseSchema>
export type EnqueueErrorResponse = z.infer<typeof EnqueueErrorResponseSchema>

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { queueName, data } = EnqueueRequestSchema.parse(body)

    let jobId: string
    switch (queueName) {
      case QUEUE_NAMES.RESOLVE_ISSUE: {
        jobId = await enqueueResolveIssue(data)
        break
      }
      case QUEUE_NAMES.COMMENT_ON_ISSUE: {
        jobId = await enqueueCommentOnIssue(data)
        break
      }
      case QUEUE_NAMES.AUTO_RESOLVE_ISSUE: {
        jobId = await enqueueAutoResolveIssue(data)
        break
      }
      default:
        const errorResponse: EnqueueErrorResponse = {
          error: `Unknown queue ${queueName}`,
        }
        return NextResponse.json(errorResponse, { status: 400 })
    }

    const response: EnqueueResponse = { jobId }
    return NextResponse.json(response)
  } catch (error) {
    console.error("[queues/enqueue] Failed to enqueue job", error)

    if (error instanceof z.ZodError) {
      const errorResponse: EnqueueErrorResponse = {
        error: "Invalid request data",
        details: error.errors,
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    const errorResponse: EnqueueErrorResponse = {
      error: "Failed to enqueue job",
    }
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
