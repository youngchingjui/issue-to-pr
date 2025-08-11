import { JobsOptions, Queue } from "bullmq"
import IORedis from "ioredis"

/*
  A thin wrapper around BullMQ that provides a singleton Queue instance which
  can be shared across the Next.js application _and_ any external worker
  process. The queue persists all jobs in Redis, allowing workers to live
  independently of the Next.js web server lifecycle.
*/

const DEFAULT_QUEUE_NAME = "default"

// Lazily-initialised Redis connection – re-using the same connection prevents
// BullMQ from spawning extra listeners and helps keep the number of open file
// descriptors low in serverless environments.
let connection: IORedis | null = null
function getRedisConnection(): IORedis {
  if (connection) return connection

  const redisUrl =
    process.env.REDIS_URL ||
    process.env.REDIS_CONNECTION_STRING ||
    "redis://localhost:6379"

  connection = new IORedis(redisUrl)
  return connection
}

// We create one QueueScheduler per queue to make sure delayed / retried jobs
// are moved into the active queue even when no worker is running at the
// moment they are scheduled.
const queues = new Map<string, Queue>()

export function getQueue(name = DEFAULT_QUEUE_NAME): Queue {
  if (queues.has(name)) return queues.get(name) as Queue

  const queue = new Queue(name, { connection: getRedisConnection() })
  queues.set(name, queue)

  return queue
}

export async function addJob<T extends Record<string, unknown>>(
  name: string,
  data: T,
  opts: JobsOptions = {}
): Promise<string> {
  const queue = getQueue()
  const job = await queue.add(name, data, opts)
  return job.id as string
}
