import { NextRequest } from "next/server"

import { workerQueue } from "@/lib/services/worker-queue"

export async function POST(
  req: NextRequest,
  { params }: { params: { queue: string } }
) {
  const payload = await req.json()
  const id = await workerQueue.enqueue(params.queue, payload)
  return Response.json({ status: "enqueued", id })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { queue: string } }
) {
  const length = await workerQueue.getQueueLength(params.queue)
  return Response.json({ queue: params.queue, length })
}

