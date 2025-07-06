import { v4 as uuidv4 } from "uuid"
import { redis } from "@/lib/redis"
import { openai } from "@/lib/openai"
import { ChatCompletionCreateParamsNonStreaming, ChatCompletionMessageParam } from "openai/resources/chat/completions"

// --- Types ---

export interface OpenAIJobRequest {
  requestId: string
  params: ChatCompletionCreateParamsNonStreaming
  jobId?: string // workflow/job ID for traceability (optional)
}

export interface OpenAIJobResult {
  requestId: string
  result?: any // the OpenAI API response
  error?: string
}

// --- Queue Config ---

const QUEUE_KEY = "openai:queue"
const RESULT_HASH_KEY = "openai:results"
const TPM_COUNTER_KEY = "openai:tpm"
const TPM_LIMIT = 800000 // set as per org's OpenAI TPM
const QUEUE_BACKOFF_KEY = "openai:backoff-until"

// -- Worker State --
let workerRunning = false
let tpmWindow = 60 // seconds
let tpmUsed = 0
let pausedUntil: number | null = null

// --- Utility ---
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// --- TPM Reset Trigger ---
async function resetTPM() {
  await redis.set(TPM_COUNTER_KEY, 0, { ex: tpmWindow })
  tpmUsed = 0
}

async function getTPM() {
  const n = await redis.get(TPM_COUNTER_KEY)
  tpmUsed = typeof n === "number" ? n : parseInt(n || "0")
  return tpmUsed
}

async function incTPM(tokens: number) {
  tpmUsed = await getTPM()
  const res = await redis.incrby(TPM_COUNTER_KEY, tokens)
  if (res === tokens) {
    // just created, set expiry
    await redis.expire(TPM_COUNTER_KEY, tpmWindow)
  }
  tpmUsed = res
  return tpmUsed
}

// --- 429 Backoff Global Pause ---
async function isPaused() {
  if (pausedUntil && Date.now() < pausedUntil) return true
  const ts = await redis.get(QUEUE_BACKOFF_KEY)
  if (ts) {
    if (Date.now() < Number(ts)) {
      pausedUntil = Number(ts)
      return true
    }
  }
  pausedUntil = null
  return false
}

async function setPause(ms: number) {
  const until = Date.now() + ms
  await redis.set(QUEUE_BACKOFF_KEY, String(until), { px: ms })
  pausedUntil = until
}

// --- Worker Loop ---
async function queueWorker() {
  if (workerRunning) return
  workerRunning = true
  console.log("[OpenAI Queue] Worker started.")
  // Loop forever (or until process exits)
  while (true) {
    // Handle pause (backoff due to 429)
    if (await isPaused()) {
      // Log and sleep for a short interval
      console.warn("[OpenAI Queue] Worker paused (429 or backoff)")
      await sleep(1500)
      continue
    }

    // Check if rate limit close to exhausted
    const used = await getTPM()
    if (used > TPM_LIMIT * 0.98) {
      console.warn(`TPM nearly exhausted: ${used}/${TPM_LIMIT}. Pausing worker for 2s.`)
      await sleep(2000)
      continue
    }

    // Dequeue job
    const jobRaw = await redis.rpop(QUEUE_KEY)
    if (!jobRaw) {
      await sleep(300) // If queue is empty, poll after delay
      continue
    }
    let job: OpenAIJobRequest
    try {
      job = JSON.parse(jobRaw)
    } catch (err) {
      console.error("[OpenAI Queue] Could not parse job:", jobRaw, err)
      continue
    }
    // Make OpenAI API call
    try {
      const openaiRes = await openai.chat.completions.create(job.params)
      // TPM counting: count usage from response
      const promptTokens = openaiRes.usage?.prompt_tokens || 0
      const compTokens = openaiRes.usage?.completion_tokens || 0
      const totalTokens = promptTokens + compTokens
      await incTPM(totalTokens)
      // Store result by requestId
      await redis.hset(RESULT_HASH_KEY, { [job.requestId]: JSON.stringify({ requestId: job.requestId, result: openaiRes }) })
      // Optionally, emit event/log
      console.log(`[OpenAI Queue] Job completed: ${job.requestId} | Took ${totalTokens} tokens`)
    } catch (err: any) {
      if (err.status === 429 || (err?.message && err.message.includes("429"))) {
        // Parse ms from error
        let waitMs = 1500
        const match = String(err?.message).match(/Please try again in (\d+)ms/)
        if (match) {
          waitMs = parseInt(match[1])
        }
        await setPause(waitMs)
        // Log 429
        await redis.hset(RESULT_HASH_KEY, { [job.requestId]: JSON.stringify({ requestId: job.requestId, error: `Rate limited, paused for ${waitMs}ms.` }) })
        console.warn(`[OpenAI Queue] 429: Pausing for ${waitMs}ms`) 
      } else {
        await redis.hset(RESULT_HASH_KEY, { [job.requestId]: JSON.stringify({ requestId: job.requestId, error: err?.message || "Unknown OpenAI API error" }) })
        console.error(`[OpenAI Queue] Job error:`, err)
      }
    }
  }
}

// Kick off background worker automatically (singleton)
queueWorker().catch((e) => console.error("[OpenAI Queue] Worker stopped due to error.", e))

// --- Main Enqueue/Dequeue API ---

/**
 * Enqueue an OpenAI job and await the result.
 * Returns the OpenAI API response or throws if error. Preserves current call API.
 */
export async function enqueueOpenAIJob({ params, jobId }: {
  params: ChatCompletionCreateParamsNonStreaming,
  jobId?: string
}): Promise<any> {
  const requestId = uuidv4()
  const job: OpenAIJobRequest = {
    requestId,
    params,
    jobId,
  }
  // Push job to queue (FIFO)
  await redis.lpush(QUEUE_KEY, JSON.stringify(job))

  // Wait for result
  let loop = 0
  // Wait up to 90s
  while (loop < 300) {
    const raw = await redis.hget(RESULT_HASH_KEY, requestId)
    if (raw) {
      let parsed: OpenAIJobResult
      try {
        parsed = JSON.parse(raw)
      } catch (err) {
        throw new Error("[OpenAI Queue] Failed to parse result from Redis.")
      }
      if (parsed.error) {
        throw new Error(parsed.error)
      } else {
        // Clean up result after retrieval
        await redis.hdel(RESULT_HASH_KEY, requestId)
        return parsed.result
      }
    }
    await sleep(300)
    loop++
  }
  throw new Error("[OpenAI Queue] Request timed out.")
}

// Observability: Expose queue state
declare global {
  // eslint-disable-next-line no-var
  var __OPENAI_QUEUE_INSPECT: any
}
if (typeof global !== "undefined") {
  // For debug/testing purposes only
  ;(global as any).__OPENAI_QUEUE_INSPECT = async () => {
    const len = await redis.llen(QUEUE_KEY)
    const used = await getTPM()
    return { len, tpm: used, pausedUntil }
  }
}
