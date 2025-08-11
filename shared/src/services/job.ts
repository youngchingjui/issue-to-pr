import { JobsOptions } from "bullmq"

import { getQueue } from "@/shared/src/services/queue"

export async function addJob<T extends Record<string, unknown>>(
  name: string,
  data: T,
  opts: JobsOptions = {}
): Promise<string> {
  const queue = getQueue(name)
  const job = await queue.add(name, data, opts)
  return job.id as string
}
