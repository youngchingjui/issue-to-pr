import { createClient } from "redis"

import { jobStatusEmitter } from "@/lib/utils"

const redis = createClient()

redis.on("error", (err) => console.log("Redis Client Error", err))

// Function to initialize and connect the Redis client
export async function initializeRedis() {
  if (!redis.isOpen) {
    await redis.connect()
  }
}

export async function updateJobStatus(jobId: string, status: string) {
  if (!redis || !redis.isOpen) throw new Error("Redis is not connected")
  try {
    await redis.set(jobId, status)
    jobStatusEmitter.emit("statusUpdate", jobId, status)
  } catch (err) {
    console.error("Failed to update job status:", err)
    throw new Error("Failed to update job status")
  }
}

export async function getJobStatus(jobId: string): Promise<string | null> {
  if (!redis || !redis.isOpen) throw new Error("Redis is not connected")
  try {
    return await redis.get(jobId)
  } catch (err) {
    console.error("Failed to get job status:", err)
    throw new Error("Failed to get job status")
  }
}
