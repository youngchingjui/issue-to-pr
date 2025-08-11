import { NextResponse } from "next/server"

import { initialize } from "@/lib/queues/client"

export const dynamic = "force-dynamic"

export async function POST() {
  try {
    // No-op: queues are created by the worker; we only ensure client initialization
    await initialize()
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[queues/init] Failed to initialize queues", error)
    return NextResponse.json(
      { error: "Failed to initialize queues" },
      { status: 500 }
    )
  }
}
