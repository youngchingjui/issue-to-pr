import { getRedisConnection } from "shared/adapters/ioredis/client"

import { getEnvVar } from "./helper"

const { REDIS_URL } = getEnvVar()

export const workerConn = getRedisConnection(REDIS_URL, "bullmq:worker")
export const eventsConn = getRedisConnection(REDIS_URL, "bullmq:events")
