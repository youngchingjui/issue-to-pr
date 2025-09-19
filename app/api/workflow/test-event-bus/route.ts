import { getRedisConnection } from "@shared/adapters/ioredis/client"
import { EventPublisherAdapter } from "@shared/adapters/ioredis/EventPublisher"
import { testEventInfrastructure } from "@shared/usecases/workflows/testEventInfrastructure"
import { NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"

export const dynamic = "force-dynamic"

export async function POST() {
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    throw new Error("REDIS_URL is not set")
  }

  // We'll create the workflowId here
  const workflowId = uuidv4()

  const conn = getRedisConnection(redisUrl)
  const eventPublisher = new EventPublisherAdapter(conn)
  try {
    // Fire the test workflow; it will emit events via the event bus
    await testEventInfrastructure(
      { rawPublisher: eventPublisher },
      { workflowId }
    )

    return NextResponse.json({ workflowId })
  } catch (err) {
    console.error("Error starting test event workflow:", err)
    return NextResponse.json(
      { error: "Failed to start workflow" },
      { status: 500 }
    )
  }
}
