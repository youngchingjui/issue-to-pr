/*
 * API endpoint for enqueuing jobs onto a specific queue.
 * Responsible for loading NextJS-specific variables, if needed,
 * Such as data that requires the user's authenticated state
 */

import { NextRequest, NextResponse } from "next/server"
import { QueueEnum } from "shared/entities/Queue"
import { addJob } from "shared/services/job"

import { getInstallationFromRepo } from "@/lib/github/repos"

import { enqueueJobsRequestSchema } from "./schemas"

export async function POST(
  req: NextRequest,
  { params }: { params: { queueId: string } }
) {
  const { queueId } = params

  const queue = QueueEnum.parse(queueId)
  const { data: job, error } = enqueueJobsRequestSchema.safeParse(
    await req.json()
  )

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    )
  }

  // Proactively validate OpenAI API key for summarize jobs to provide a clear error
  const requiresOpenAI = job.name === "summarizeIssue"
  if (requiresOpenAI && !process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        success: false,
        error:
          "OpenAI API key is missing. Please set OPENAI_API_KEY to use issue summarization.",
      },
      { status: 401 }
    )
  }

  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    return NextResponse.json(
      { success: false, error: "REDIS_URL is not set" },
      { status: 500 }
    )
  }

  if (job.name === "autoResolveIssue") {
    try {
      const full = job.data.repoFullName
      const [owner, repo] = (full || "").split("/")
      if (!owner || !repo) {
        throw new Error("Invalid repoFullName; expected 'owner/repo'")
      }
      const installation = await getInstallationFromRepo({ owner, repo })
      const githubInstallationId = String(installation?.data?.id ?? "")
      if (!githubInstallationId) {
        throw new Error("Failed to resolve GitHub App installation id")
      }

      const jobId = await addJob(
        queue,
        {
          name: "autoResolveIssue",
          data: {
            ...job.data,
            githubInstallationId,
          },
        },
        {},
        redisUrl
      )
      return NextResponse.json({ success: true, jobId })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      throw new Error(`autoResolveIssue setup failed: ${msg}`)
    }
  }

  const jobId = await addJob(queue, job, {}, redisUrl)
  return NextResponse.json({ success: true, jobId })
}

export async function GET(
  req: NextRequest,
  { params }: { params: { queueId: string } }
) {
  // TODO: Implement this.
  return NextResponse.json({ success: false, status: "not implemented yet" })
}
