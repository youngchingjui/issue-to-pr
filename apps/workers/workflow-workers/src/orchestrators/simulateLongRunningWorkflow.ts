import { publishJobStatus } from "../helper"

export async function simulateLongRunningWorkflow(
  seconds: number,
  jobId: string
): Promise<string> {
  const total = Math.max(1, Math.floor(seconds))
  for (let i = 1; i <= total; i++) {
    // Log to worker logs and publish status for UI
    console.log(`[simulateLongRunningWorkflow] tick ${i}/${total}`)
    await publishJobStatus(jobId, `Tick ${i}/${total}`)
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  const result = `Ran for ${total} seconds`
  return result
}

