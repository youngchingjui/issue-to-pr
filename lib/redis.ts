import { createClient } from "redis"

import { jobStatusEmitter } from "@/lib/utils"

const redis = createClient()
await redis.connect()
redis.on("error", (err) => console.log("Redis Client Error", err))

export async function updateJobStatus(jobId: string, status: string) {
  if (!redis || !redis.isOpen) throw new Error("Redis is not connected")
  try {
    await redis.set(jobId, status)
    await redis.publish("jobStatusUpdate", JSON.stringify({ jobId, status }))
    jobStatusEmitter.emit("statusUpdate", jobId, status)
  } catch (err) {
    console.error("Failed to update job status:", err)
    throw new Error("Failed to update job status")
  }
}
