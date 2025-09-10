import { getRedisConnection } from "@shared/adapters/ioredis/client"
import { Queue } from "bullmq"

const queuesByKey = new Map<string, Queue>()
export function getQueue(name: string, redisUrl: string): Queue {
  const key = `${name}::${redisUrl}`
  if (queuesByKey.has(key)) return queuesByKey.get(key) as Queue

  const queue = new Queue(name, { connection: getRedisConnection(redisUrl) })
  queuesByKey.set(key, queue)

  return queue
}

// TODO: Define a core entity Queue in src/core/entities/queue.ts
// To follow clean architecture principles
// It'll probably need some sort of redis connection, so that Connection object
// should be defined as well.
// Of course bullmq only supports ioredis library, so we can bake those into the
// entities for now.
