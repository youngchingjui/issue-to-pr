import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import {
  enqueueAutoResolveIssue,
  enqueueCommentOnIssue,
  enqueueResolveIssue,
} from "@/lib/queues/client"
import {
  EnqueueErrorResponse,
  EnqueueResponse,
  QUEUE_NAMES,
} from "@/shared/lib/schemas"

import { EnqueueRequestSchema } from "./schemas"

export const dynamic = "force-dynamic"

// TODO: Define zod schemas for request and response and save in ./schemas.ts
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
