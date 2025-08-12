import { Queue } from "bullmq"

import { getRedisConnection } from "@/shared/src/services/redis/ioredis"

const queues = new Map<string, Queue>()
export function getQueue(name: string): Queue {
  if (queues.has(name)) return queues.get(name) as Queue

  const queue = new Queue(name, { connection: getRedisConnection() })
  queues.set(name, queue)

  return queue
}
