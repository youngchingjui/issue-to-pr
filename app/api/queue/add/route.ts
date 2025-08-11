import { NextRequest, NextResponse } from "next/server"
import { addJob } from "@/lib/queue"

interface Body {
  name?: string
  data?: Record<string, unknown>
  options?: Record<string, unknown>
}

export async function POST(req: NextRequest) {
  const { name = "example", data = {}, options = {} } = (await req.json()) as Body

  const jobId = await addJob(name, data, options)

  return NextResponse.json({ success: true, id: jobId })
}

