import Redis from "ioredis"

import { jobStatusEmitter } from "@/lib/utils"

const redis = new Redis()

export async function updateJobStatus(jobId: string, status: string) {
  await redis.set(jobId, status)
  jobStatusEmitter.emit("statusUpdate", jobId, status)
}

export async function getJobStatus(jobId: string): Promise<string | null> {
  return await redis.get(jobId)
}
