/*
 * API endpoint for enqueuing jobs onto a specific queue.
 * Responsible for loading NextJS-specific variables, if needed,
 * Such as data that requires the user's authenticated state
 * We avoid putting sensitive data in the job queue.
 */

// TODO: Generally, NextJS API routes are good places to verify process.env variables.
// TODO: Make a .env helper that returns a validated (maybe with zod) object including
// all of our env variables, so we can use them in API routes easily.
// The helper can just handle missing env variables for us. Or, maybe not. Maybe some env variables are OK to leave blank.
// To be determined.

// TODO: This can be converted to a server action.
import { NextRequest, NextResponse } from "next/server"

import { auth } from "@/auth"
import { getInstallationFromRepo } from "@/lib/github/repos"
import { QueueEnum } from "@/shared/entities/Queue"
import { addJob } from "@/shared/services/job"

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
      // We need to get the authenticated user's login
      // So that the use case can fetch their OpenAI API key

      const session = await auth()
      if (!session) {
        throw new Error("Authentication required")
      }
      const { profile } = session
      if (!profile) {
        throw new Error("Authentication failed, could not find profile")
      }
      const full = job.data.repoFullName
      const [owner, repo] = (full || "").split("/")
      if (!owner || !repo) {
        throw new Error("Invalid repoFullName; expected 'owner/repo'")
      }

      // TODO: Explore, should the installation ID be retrieved here in the API route?
      // Or should it be retrieved by the worker / workflow?
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
            githubLogin: profile.login,
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
