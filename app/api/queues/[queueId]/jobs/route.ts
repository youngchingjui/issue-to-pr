import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { QUEUE_NAMES, type QueueName } from "@/shared/core/entities/Queue"

import { enqueueJobsRequestSchema } from "./schemas"

// Job status enum
const JobStatusSchema = z.enum([
  "waiting",
  "active",
  "completed",
  "failed",
  "delayed",
])

// Response schemas
const JobSchema = z.object({
  id: z.string(),
  name: z.string(),
  data: z.unknown(),
  status: JobStatusSchema,
  progress: z.union([z.number(), z.object({}).passthrough()]).optional(),
  timestamp: z.number().optional(),
  processedOn: z.number().nullable().optional(),
  finishedOn: z.number().nullable().optional(),
  failedReason: z.string().optional(),
})

// Types
type Job = z.infer<typeof JobSchema>
type JobStatus = z.infer<typeof JobStatusSchema>

// Mock storage for jobs (in a real implementation, this would be a proper queue system like Bull/BullMQ)
const jobs = new Map<string, Map<string, Job>>()

// Initialize queue storage if it doesn't exist
function ensureQueueExists(queueId: string) {
  if (!jobs.has(queueId)) {
    jobs.set(queueId, new Map())
  }
}

// Validate queue ID
function validateQueueId(queueId: string): queueId is QueueName {
  return Object.values(QUEUE_NAMES).includes(queueId as QueueName)
}

export const dynamic = "force-dynamic"

/**
 * List jobs for queueId
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { queueId: string } }
) {
  try {
    const { queueId } = params

    if (!validateQueueId(queueId)) {
      return NextResponse.json({ error: "Invalid queue ID" }, { status: 400 })
    }

    ensureQueueExists(queueId)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") as JobStatus | null
    const limit = parseInt(searchParams.get("limit") || "50", 10)
    const cursor = searchParams.get("cursor")

    const queueJobs = jobs.get(queueId)!
    let jobsList = Array.from(queueJobs.values())

    // Filter by status if provided
    if (status && JobStatusSchema.safeParse(status).success) {
      jobsList = jobsList.filter((job) => job.status === status)
    }

    // Sort by timestamp (newest first)
    jobsList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))

    // Handle pagination with cursor
    let startIndex = 0
    if (cursor) {
      const cursorIndex = jobsList.findIndex((job) => job.id === cursor)
      if (cursorIndex >= 0) {
        startIndex = cursorIndex + 1
      }
    }

    const paginatedJobs = jobsList.slice(startIndex, startIndex + limit)
    const hasMore = startIndex + limit < jobsList.length
    const nextCursor =
      hasMore && paginatedJobs.length > 0
        ? paginatedJobs[paginatedJobs.length - 1].id
        : undefined

    const response = {
      jobs: paginatedJobs,
      total: jobsList.length,
      ...(nextCursor && { cursor: nextCursor }),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error listing jobs:", error)
    return NextResponse.json({ error: "Failed to list jobs" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { queueId: string } }
) {
  try {
    const { queueId } = params

    const { jobs } = await enqueueJobsRequestSchema.parse(await request.json())

    const jobIds = jobs.map((job) => {
      return enqueueJob(queueId, job)
    })

    return NextResponse.json({ jobIds }, { status: 202 })
  } catch (error) {
    console.error("Error adding jobs:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: "Failed to add jobs" }, { status: 500 })
  }
}
