import IORedis from "ioredis"

import { getRedisConnection } from "@shared/services/redis/ioredis"

/**
 * Simple Redis-backed fixed window rate limiter.
 *
 * It enforces a maximum number of "slots" per time window across all
 * processes sharing the same Redis.
 *
 * Usage:
 *   await acquireRateLimitSlot("openai:chat", 30, 60_000)
 *
 * If maxPerWindow is falsy (0/undefined/null), the limiter is disabled.
 */
export async function acquireRateLimitSlot(
  resourceKey: string,
  maxPerWindow: number | undefined | null,
  windowMs = 60_000,
  connection?: IORedis
): Promise<void> {
  if (!maxPerWindow || maxPerWindow <= 0) return

  const redis = connection ?? getRedisConnection()

  // Lua script: try to take a slot from the current window atomically.
  // Returns an array: [status, pttl]
  // - status = 1 if the slot was acquired successfully.
  // - status = 0 if there is no slot available; pttl is the ms remaining in the window.
  const lua = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])

local count = redis.call('GET', key)
if not count then
  redis.call('SET', key, 1, 'PX', ttl)
  return {1, ttl}
end
count = tonumber(count)
if count < limit then
  local newCount = redis.call('INCR', key)
  local pttl = redis.call('PTTL', key)
  if pttl < 0 then
    redis.call('PEXPIRE', key, ttl)
    pttl = ttl
  end
  return {1, pttl}
else
  local pttl = redis.call('PTTL', key)
  if pttl < 0 then pttl = ttl end
  return {0, pttl}
end
`

  while (true) {
    const now = Date.now()
    const windowId = Math.floor(now / windowMs)
    const key = `rate:${resourceKey}:${windowId}`

    const res = (await redis.eval(lua, 1, key, String(maxPerWindow), String(windowMs))) as [
      number,
      number
    ]

    const status = res?.[0]
    const pttl = res?.[1] ?? windowMs

    if (status === 1) {
      // Acquired slot
      return
    }

    // No slot available—sleep until the next window
    const sleepMs = Math.min(typeof pttl === 'number' ? pttl : windowMs, windowMs)
    await new Promise((r) => setTimeout(r, sleepMs))
  }
}

/**
 * Helper that reads the global limit from environment variables and acquires a slot.
 *
 * Env: LLM_CALLS_PER_MINUTE or OPENAI_CALLS_PER_MINUTE
 */
export async function rateLimitOpenAI(
  scope: string = "chat"
): Promise<void> {
  const raw =
    process.env.LLM_CALLS_PER_MINUTE || process.env.OPENAI_CALLS_PER_MINUTE
  const limit = raw ? Number(raw) : undefined
  // Namespacing by scope allows separate budgets (e.g., chat vs. transcribe) if desired
  await acquireRateLimitSlot(`openai:${scope}`, limit)
}

