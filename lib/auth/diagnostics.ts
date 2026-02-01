/**
 * Auth Diagnostics
 *
 * Temporary instrumentation to measure auth() performance.
 * Tracks timing and paths through the auth system.
 *
 * Usage:
 * 1. Replace `import { auth } from "@/auth"` with
 *    `import { authWithDiagnostics as auth } from "@/lib/auth/diagnostics"`
 *
 * 2. To force a token refresh for testing, call:
 *    `await forceTokenExpiry()` or hit GET /api/auth-diagnostics?action=expire
 *
 * View logs in server console to see timing data.
 */

import { auth as originalAuth, setForceRefreshFlag } from "@/auth"
import { redis } from "@/lib/redis"

type AuthPath =
  | "fresh-token"
  | "token-valid"
  | "refresh-got-lock"
  | "refresh-waited-for-lock"
  | "refresh-from-cache"
  | "refresh-max-retries"
  | "no-session"
  | "error"

interface AuthDiagnostic {
  callId: string
  caller: string
  startTime: number
  endTime?: number
  durationMs?: number
  path?: AuthPath
  tokenExpired?: boolean
  refreshTriggered?: boolean
  redisOperations?: number
  error?: string
}

// Track concurrent calls within the same request
const requestCalls = new Map<string, AuthDiagnostic[]>()

// Store recent request summaries for API access (circular buffer, last 10)
interface RequestSummary {
  requestId: string
  timestamp: string
  totalCalls: number
  wallClockMs: number
  minMs: number
  avgMs: number
  maxMs: number
  calls: Array<{ caller: string; durationMs: number; path: string }>
}
const recentSummaries: RequestSummary[] = []
const MAX_SUMMARIES = 10

// Track refresh operations
interface RefreshDiagnostic {
  callId: string
  startTime: number
  endTime?: number
  durationMs?: number
  lockAcquired: boolean
  lockAttempts: number
  usedCachedToken: boolean
  refreshedFromGitHub: boolean
  redisOps: number
}

const refreshDiagnostics: RefreshDiagnostic[] = []

// Generate a simple call ID
let callCounter = 0
function generateCallId(): string {
  return `auth-${Date.now()}-${++callCounter}`
}

// Get a request ID from the current execution context
function getRequestId(): string {
  // Round to nearest 100ms to group concurrent calls
  return `req-${Math.floor(Date.now() / 100) * 100}`
}

/**
 * Instrumented auth() that logs timing and path information
 */
export async function authWithDiagnostics(caller: string = "unknown") {
  const callId = generateCallId()
  const requestId = getRequestId()
  const startTime = performance.now()

  const diagnostic: AuthDiagnostic = {
    callId,
    caller,
    startTime,
  }

  // Track this call
  if (!requestCalls.has(requestId)) {
    requestCalls.set(requestId, [])
  }
  requestCalls.get(requestId)!.push(diagnostic)

  console.log(
    `[AUTH-DIAG] ${callId} | START | caller=${caller} | requestId=${requestId}`
  )

  try {
    const session = await originalAuth()
    const endTime = performance.now()
    const durationMs = endTime - startTime

    diagnostic.endTime = endTime
    diagnostic.durationMs = durationMs
    diagnostic.path = session ? "token-valid" : "no-session"

    console.log(
      `[AUTH-DIAG] ${callId} | END | caller=${caller} | duration=${durationMs.toFixed(2)}ms | hasSession=${!!session} | user=${session?.profile?.login ?? "none"}`
    )

    // Log summary for this request group after a short delay
    setTimeout(() => {
      logRequestSummary(requestId)
    }, 500)

    return session
  } catch (error) {
    const endTime = performance.now()
    const durationMs = endTime - startTime

    diagnostic.endTime = endTime
    diagnostic.durationMs = durationMs
    diagnostic.path = "error"
    diagnostic.error = error instanceof Error ? error.message : String(error)

    console.error(
      `[AUTH-DIAG] ${callId} | ERROR | caller=${caller} | duration=${durationMs.toFixed(2)}ms | error=${diagnostic.error}`
    )

    throw error
  }
}

function logRequestSummary(requestId: string) {
  const calls = requestCalls.get(requestId)
  if (!calls || calls.length === 0) return

  // Only log once
  if ((calls as unknown as { logged?: boolean }).logged) return
  ;(calls as unknown as { logged?: boolean }).logged = true

  const completedCalls = calls.filter((c) => c.durationMs !== undefined)
  if (completedCalls.length === 0) return

  const totalDuration = Math.max(...completedCalls.map((c) => c.durationMs!))
  const avgDuration =
    completedCalls.reduce((sum, c) => sum + c.durationMs!, 0) /
    completedCalls.length
  const minDuration = Math.min(...completedCalls.map((c) => c.durationMs!))
  const maxDuration = Math.max(...completedCalls.map((c) => c.durationMs!))

  // Store summary for API access
  const summary: RequestSummary = {
    requestId,
    timestamp: new Date().toISOString(),
    totalCalls: calls.length,
    wallClockMs: Math.round(totalDuration * 100) / 100,
    minMs: Math.round(minDuration * 100) / 100,
    avgMs: Math.round(avgDuration * 100) / 100,
    maxMs: Math.round(maxDuration * 100) / 100,
    calls: completedCalls.map((c) => ({
      caller: c.caller,
      durationMs: Math.round(c.durationMs! * 100) / 100,
      path: c.path ?? "unknown",
    })),
  }
  recentSummaries.push(summary)
  if (recentSummaries.length > MAX_SUMMARIES) {
    recentSummaries.shift()
  }

  console.log(`
[AUTH-DIAG] ═══════════════════════════════════════════════════════
[AUTH-DIAG] REQUEST SUMMARY: ${requestId}
[AUTH-DIAG] ───────────────────────────────────────────────────────
[AUTH-DIAG] Total auth() calls: ${calls.length}
[AUTH-DIAG] Wall-clock time: ${totalDuration.toFixed(2)}ms
[AUTH-DIAG] Min/Avg/Max: ${minDuration.toFixed(0)}/${avgDuration.toFixed(0)}/${maxDuration.toFixed(0)}ms
[AUTH-DIAG] ───────────────────────────────────────────────────────
${completedCalls.map((c) => `[AUTH-DIAG]   ${c.caller.padEnd(25)} ${c.durationMs!.toFixed(2).padStart(8)}ms  ${c.path ?? ""}`).join("\n")}
[AUTH-DIAG] ═══════════════════════════════════════════════════════
`)

  // Clean up after logging
  requestCalls.delete(requestId)
}

/**
 * Get recent request summaries for API access
 */
export function getRecentSummaries(): RequestSummary[] {
  return [...recentSummaries]
}

/**
 * Factory to create a caller-specific auth function
 */
export function createAuthWithDiagnostics(caller: string) {
  return () => authWithDiagnostics(caller)
}

// ============================================================================
// Token Expiry Management for Testing
// ============================================================================

/**
 * Force the current user's token to appear expired.
 * This modifies the cached token in Redis to have an expired timestamp.
 *
 * Call this before navigating to a page to test the refresh flow.
 */
export async function forceTokenExpiry(): Promise<{
  success: boolean
  message: string
  userId?: string
}> {
  try {
    // Get current session to find user ID
    const session = await originalAuth()
    if (!session?.token?.sub) {
      return { success: false, message: "No authenticated session found" }
    }

    const userId = session.token.sub
    const tokenKey = `token_${userId}`

    // Get the current cached token
    const cachedToken = await redis.get(tokenKey)
    if (!cachedToken) {
      return {
        success: false,
        message: "No cached token in Redis",
        userId,
      }
    }

    // Parse and modify the token to be expired
    const token =
      typeof cachedToken === "string" ? JSON.parse(cachedToken) : cachedToken

    const originalExpiresAt = token.expires_at
    // Set expires_at to 1 hour ago
    token.expires_at = Math.floor(Date.now() / 1000) - 3600

    // Save the modified token back to Redis
    await redis.set(tokenKey, JSON.stringify(token), {
      ex: 300, // Keep it for 5 minutes for testing
    })

    console.log(`[AUTH-DIAG] Forced token expiry for user ${userId}`)
    console.log(
      `[AUTH-DIAG]   Original expires_at: ${originalExpiresAt} (${new Date(originalExpiresAt * 1000).toISOString()})`
    )
    console.log(
      `[AUTH-DIAG]   New expires_at: ${token.expires_at} (${new Date(token.expires_at * 1000).toISOString()})`
    )

    return {
      success: true,
      message: `Token for user ${userId} marked as expired. Next auth() call will trigger refresh.`,
      userId,
    }
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/**
 * Trigger a force refresh on the next auth() call.
 * This sets a flag in Redis that the JWT callback checks.
 * Unlike forceTokenExpiry, this works even when there's no cached token.
 */
export async function triggerForceRefresh(): Promise<{
  success: boolean
  message: string
  userId?: string
}> {
  try {
    const session = await originalAuth()
    if (!session?.token?.sub) {
      return { success: false, message: "No authenticated session found" }
    }

    const userId = session.token.sub
    await setForceRefreshFlag(userId)

    console.log(`[AUTH-DIAG] Set force refresh flag for user ${userId}`)

    return {
      success: true,
      message: `Force refresh flag set for user ${userId}. Next auth() call will trigger refresh.`,
      userId,
    }
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/**
 * Clear the cached token from Redis entirely.
 * This forces a fresh token fetch on next auth() call.
 */
export async function clearCachedToken(): Promise<{
  success: boolean
  message: string
  userId?: string
}> {
  try {
    const session = await originalAuth()
    if (!session?.token?.sub) {
      return { success: false, message: "No authenticated session found" }
    }

    const userId = session.token.sub
    const tokenKey = `token_${userId}`
    const lockKey = `token_refresh_lock_${userId}`

    // Delete both token and any existing lock
    await redis.del(tokenKey)
    await redis.del(lockKey)

    console.log(`[AUTH-DIAG] Cleared cached token and lock for user ${userId}`)

    return {
      success: true,
      message: `Cleared cached token for user ${userId}`,
      userId,
    }
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/**
 * Get diagnostic info about the current token state
 */
export async function getTokenDiagnostics(): Promise<{
  hasSession: boolean
  userId?: string
  tokenInRedis: boolean
  tokenExpiresAt?: string
  tokenExpired?: boolean
  lockExists?: boolean
  sessionExpiresAt?: string
}> {
  try {
    const session = await originalAuth()
    if (!session?.token?.sub) {
      return { hasSession: false, tokenInRedis: false }
    }

    const userId = session.token.sub
    const tokenKey = `token_${userId}`
    const lockKey = `token_refresh_lock_${userId}`

    const [cachedToken, lockExists] = await Promise.all([
      redis.get(tokenKey),
      redis.exists(lockKey),
    ])

    const now = Math.floor(Date.now() / 1000)
    let tokenExpiresAt: string | undefined
    let tokenExpired: boolean | undefined

    if (cachedToken) {
      const token =
        typeof cachedToken === "string" ? JSON.parse(cachedToken) : cachedToken
      if (token.expires_at) {
        tokenExpiresAt = new Date(token.expires_at * 1000).toISOString()
        tokenExpired = token.expires_at < now
      }
    }

    return {
      hasSession: true,
      userId,
      tokenInRedis: !!cachedToken,
      tokenExpiresAt,
      tokenExpired,
      lockExists: lockExists === 1,
      sessionExpiresAt: session.token.expires_at
        ? new Date((session.token.expires_at as number) * 1000).toISOString()
        : undefined,
    }
  } catch (error) {
    return { hasSession: false, tokenInRedis: false }
  }
}

// ============================================================================
// Instrumented Refresh Function (for deeper diagnostics)
// ============================================================================

/**
 * Wrap this around refreshTokenWithLock to get detailed timing.
 * Add this to lib/utils/auth.ts if you want per-operation timing.
 */
export function instrumentRedisOperation<T>(
  operationName: string,
  operation: () => Promise<T>
): Promise<T> {
  const start = performance.now()
  return operation().then(
    (result) => {
      const duration = performance.now() - start
      console.log(
        `[AUTH-DIAG] Redis ${operationName}: ${duration.toFixed(2)}ms`
      )
      return result
    },
    (error) => {
      const duration = performance.now() - start
      console.log(
        `[AUTH-DIAG] Redis ${operationName} FAILED: ${duration.toFixed(2)}ms`
      )
      throw error
    }
  )
}

// ============================================================================
// Direct Refresh Path Testing
// ============================================================================

/**
 * Simulate the refreshTokenWithLock behavior to measure Redis lock contention.
 * This doesn't actually refresh a token, but measures:
 * 1. How long it takes to acquire a Redis lock
 * 2. How long concurrent callers wait when lock is held
 */
/**
 * Test raw Redis latency
 */
export async function testRedisLatency(): Promise<{
  pingMs: number
  setMs: number
  getMs: number
  delMs: number
  totalMs: number
}> {
  const testKey = `latency_test_${Date.now()}`

  const start = performance.now()

  const pingStart = performance.now()
  await redis.ping()
  const pingMs = performance.now() - pingStart

  const setStart = performance.now()
  await redis.set(testKey, "test-value", { ex: 10 })
  const setMs = performance.now() - setStart

  const getStart = performance.now()
  await redis.get(testKey)
  const getMs = performance.now() - getStart

  const delStart = performance.now()
  await redis.del(testKey)
  const delMs = performance.now() - delStart

  const totalMs = performance.now() - start

  return {
    pingMs: Math.round(pingMs * 100) / 100,
    setMs: Math.round(setMs * 100) / 100,
    getMs: Math.round(getMs * 100) / 100,
    delMs: Math.round(delMs * 100) / 100,
    totalMs: Math.round(totalMs * 100) / 100,
  }
}

export async function testRefreshLockContention(
  concurrentCalls: number = 3
): Promise<{
  success: boolean
  totalMs: number
  results: Array<{
    callerId: number
    durationMs: number
    gotLock: boolean
    waitedForLock: boolean
    attempts: number
  }>
}> {
  const lockKey = `test_lock_${Date.now()}`
  const lockTimeout = 5 // 5 seconds
  const retryDelay = 100 // 100ms between retries
  const maxRetries = 50 // Max 5 seconds of waiting

  interface CallResult {
    callerId: number
    durationMs: number
    gotLock: boolean
    waitedForLock: boolean
    attempts: number
  }

  async function simulateRefreshCall(callerId: number): Promise<CallResult> {
    const startTime = performance.now()
    let attempts = 0
    let gotLock = false
    let waitedForLock = false

    while (attempts < maxRetries) {
      attempts++

      // Try to acquire lock
      const lockAcquired = await redis.set(lockKey, `caller-${callerId}`, {
        ex: lockTimeout,
        nx: true,
      })

      if (lockAcquired) {
        gotLock = true
        // Simulate some work (like refreshing a token)
        await new Promise((resolve) => setTimeout(resolve, 50))
        // Release lock
        await redis.del(lockKey)
        break
      } else {
        waitedForLock = true
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, retryDelay))
      }
    }

    const endTime = performance.now()
    return {
      callerId,
      durationMs: Math.round((endTime - startTime) * 100) / 100,
      gotLock,
      waitedForLock,
      attempts,
    }
  }

  const startTime = performance.now()

  // Launch all calls concurrently
  const promises = Array.from({ length: concurrentCalls }, (_, i) =>
    simulateRefreshCall(i + 1)
  )

  const results = await Promise.all(promises)
  const endTime = performance.now()

  // Clean up
  await redis.del(lockKey)

  return {
    success: true,
    totalMs: Math.round((endTime - startTime) * 100) / 100,
    results,
  }
}
