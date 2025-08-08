import { NextResponse } from "next/server"

import { getAllQueuesStatus } from "@/lib/queues/client"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const status = await getAllQueuesStatus()
    return NextResponse.json({ status })
  } catch (error) {
    console.error("[queues/status] Failed to fetch queues status", error)
    return NextResponse.json(
      { error: "Failed to fetch queues status" },
      { status: 500 }
    )
  }
}
