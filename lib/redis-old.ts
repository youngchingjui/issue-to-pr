// TODO: Migrate away from old Redis client

import { createClient } from "redis"

import { jobStatusEmitter } from "@/lib/utils/utils-common"

const redis = createClient({
  url: process.env.REDIS_URL,
})
await redis.connect()
redis.on("error", (err) => console.log("redis client error ", err))

export async function updateJobStatus(jobId: string, status: string) {
  if (!redis || !redis.isOpen) throw new Error("redis is not connected")
  try {
    await redis.set(jobId, status)
    await redis.publish("jobStatusUpdate", JSON.stringify({ jobId, status }))
    jobStatusEmitter.emit("statusUpdate", jobId, status)
  } catch (err) {
    console.error("Failed to update job status:", err)
    throw new Error("Failed to update job status")
  }
}
