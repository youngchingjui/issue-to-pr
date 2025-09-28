import { NextRequest, NextResponse } from "next/server"
import { JobEventSchema } from "shared/entities/events/Job"
import { QueueEnum } from "shared/entities/Queue"
import { addJob } from "shared/services/job"

import { enqueueJobsRequestSchema } from "./schemas"
import { getInstallationFromRepo } from "@/lib/github/repos"

export async function POST(
  req: NextRequest,
  { params }: { params: { queueId: string } }
) {
  const { queueId } = params

  const queue = QueueEnum.parse(queueId)
  const { data, error } = enqueueJobsRequestSchema.safeParse(await req.json())

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    )
  }

  const { jobs } = data

  // Proactively validate OpenAI API key for summarize jobs to provide a clear error
  const requiresOpenAI = jobs.some((j) => j.name === "summarizeIssue")
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

  const jobIds = await Promise.all(
    jobs.map(async (job) => {
      // Augment autoResolveIssue jobs with installation id derived from repo
      if (job.name === "autoResolveIssue") {
        try {
          const full = job.data?.repoFullName as string
          const [owner, repo] = (full || "").split("/")
          if (!owner || !repo) {
            throw new Error("Invalid repoFullName; expected 'owner/repo'")
          }
          const installation = await getInstallationFromRepo({ owner, repo })
          const githubInstallationId = String(installation?.data?.id ?? "")
          if (!githubInstallationId) {
            throw new Error("Failed to resolve GitHub App installation id")
          }
          job = {
            ...job,
            data: {
              ...job.data,
              githubInstallationId,
            },
          } as typeof job
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          throw new Error(`autoResolveIssue setup failed: ${msg}`)
        }
      }

      const parsedJob = JobEventSchema.parse(job)
      return addJob(queue, parsedJob, job.opts, redisUrl)
    })
  )

  return NextResponse.json({ success: true, jobIds })
}

export async function GET(
  req: NextRequest,
  { params }: { params: { queueId: string } }
) {
  // TODO: Implement this.
  return NextResponse.json({ success: false, status: "not implemented yet" })
}

