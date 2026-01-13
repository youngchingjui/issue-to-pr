// TODO: Migrate away from old Redis client

import { createClient } from "redis"

import { jobStatusEmitter } from "@/lib/utils/utils-common"

// Use a lazy-initialized client so we don't attempt a network connection when
// this module is first imported (e.g. during `next build`).
let redis: ReturnType<typeof createClient> | null = null

async function getRedis() {
  if (redis && redis.isOpen) return redis

  // (Re)create the client on first use or after the previous connection closed.
  redis = createClient({
    url: process.env.REDIS_URL,
  })

  // Surface connection errors but don't crash the build – callers can decide
  // how to handle failures.
  redis.on("error", (err) => console.error("Redis client error:", err))

  try {
    await redis.connect()
  } catch (err) {
    console.error("Unable to connect to Redis:", err)
    // Return the client anyway so that feature-flagged callers can decide what
    // to do. They might treat a missing connection as a no-op when Redis is
    // optional.
  }

  return redis
}

export async function updateJobStatus(jobId: string, status: string) {
  const client = await getRedis()

  // If the connection failed `client.isOpen` will be false – treat this as a
  // no-op so the application can continue when Redis is optional.
  if (!client.isOpen) {
    console.warn(
      "updateJobStatus: Redis is not connected – skipping status publish."
    )
    return
  }

  try {
    await client.set(jobId, status)
    await client.publish("jobStatusUpdate", JSON.stringify({ jobId, status }))
    jobStatusEmitter.emit("statusUpdate", jobId, status)
  } catch (err) {
    console.error("Failed to update job status:", err)
    throw new Error("Failed to update job status")
  }
}
