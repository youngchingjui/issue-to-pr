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

  const jobIds = await Promise.all(
    jobs.map((job) => addJob(queueId, job.name, job.data ?? {}, job.opts))
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

