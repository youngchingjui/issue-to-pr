import { Queue } from "bullmq"

import { getRedisConnection } from "@/shared/src/services/redis/ioredis"

const queues = new Map<string, Queue>()
export function getQueue(name: string): Queue {
  if (queues.has(name)) return queues.get(name) as Queue

  const queue = new Queue(name, { connection: getRedisConnection() })
  queues.set(name, queue)

  return queue
}

// TODO: Define a core entity Queue in src/core/entities/queue.ts
// To follow clean architecture principles
// It'll probably need some sort of redis connection, so that Connection object
// should be defined as well.
// Of course bullmq only supports ioredis library, so we can bake those into the
// entities for now.
