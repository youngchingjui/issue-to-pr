import { addJob } from "@shared/services/job"
import { NextRequest, NextResponse } from "next/server"

import { enqueueJobsRequestSchema } from "./schemas"

export async function POST(
  req: NextRequest,
  { params }: { params: { queueId: string } }
) {
  const { queueId } = params

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
    jobs.map((job) =>
      addJob(queueId, job.name, job.data ?? {}, job.opts, redisUrl)
    )
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
