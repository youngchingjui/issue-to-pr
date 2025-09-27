import { Queue } from "bullmq"

import { getRedisConnection } from "@/adapters/ioredis/client"
import { QueueEnum } from "@/entities/Queue"

const queuesByKey = new Map<string, Queue>()
export function getQueue(name: QueueEnum, redisUrl: string): Queue {
  const key = `${name}::${redisUrl}`

  const queue = queuesByKey.get(key)
  // Existing queue found, return it
  if (queue) return queue

  // Create a new queue
  const newQueue = new Queue(name.toString(), {
    connection: getRedisConnection(redisUrl, "bullmq:queue"),
  })
  queuesByKey.set(key, newQueue)

  return newQueue
}

// TODO: Define a core entity Queue in src/core/entities/queue.ts
// To follow clean architecture principles
// It'll probably need some sort of redis connection, so that Connection object
// should be defined as well.
// Of course bullmq only supports ioredis library, so we can bake those into the
// entities for now.
