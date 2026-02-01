import { JWT } from "next-auth/jwt"

import { AUTH_CONFIG } from "@/lib/auth/config"
import { redis } from "@/lib/redis"

// ============================================================================
// Refresh Diagnostics - Detailed instrumentation for token refresh flow
// ============================================================================

interface RefreshDiagnostics {
  callId: string
  userId: string
  startTime: number
  endTime?: number
  totalMs?: number
  outcome:
    | "got-lock-cache-hit"
    | "got-lock-refreshed"
    | "waited-cache-hit"
    | "max-retries-cache-hit"
    | "max-retries-failed"
    | "error"
  lockAttempts: number
  redisOps: RedisOpTiming[]
  githubApiMs?: number
  error?: string
}

interface RedisOpTiming {
  op: string
  key: string
  startMs: number
  durationMs: number
  result?: string
}

// Enable/disable detailed refresh logging
let refreshDiagnosticsEnabled = true

export function enableRefreshDiagnostics() {
  refreshDiagnosticsEnabled = true
}

export function disableRefreshDiagnostics() {
  refreshDiagnosticsEnabled = false
}

// Store recent refresh diagnostics for API access
const recentRefreshDiagnostics: RefreshDiagnostics[] = []
const MAX_REFRESH_DIAGNOSTICS = 20

export function getRecentRefreshDiagnostics(): RefreshDiagnostics[] {
  return [...recentRefreshDiagnostics]
}

export function clearRefreshDiagnostics(): void {
  recentRefreshDiagnostics.length = 0
}

// Generate a unique call ID for tracking
let refreshCallCounter = 0
function generateRefreshCallId(): string {
  return `refresh-${Date.now()}-${++refreshCallCounter}`
}

// Instrumented Redis operations
async function timedRedisSetNx(
  diag: RefreshDiagnostics,
  key: string,
  value: string,
  ex: number
): Promise<string | null> {
  const opStart = performance.now()
  const result = await redis.set(key, value, { ex, nx: true })
  const duration = performance.now() - opStart
  diag.redisOps.push({
    op: "set(nx)",
    key: key.replace(diag.userId, "<userId>"),
    startMs: opStart - diag.startTime,
    durationMs: Math.round(duration * 100) / 100,
    result: result ? "OK" : "null",
  })
  return result
}

async function timedRedisSet(
  diag: RefreshDiagnostics,
  key: string,
  value: string,
  ex: number
): Promise<string | null> {
  const opStart = performance.now()
  const result = await redis.set(key, value, { ex })
  const duration = performance.now() - opStart
  diag.redisOps.push({
    op: "set",
    key: key.replace(diag.userId, "<userId>"),
    startMs: opStart - diag.startTime,
    durationMs: Math.round(duration * 100) / 100,
    result: result ? "OK" : "null",
  })
  return result
}

async function timedRedisGet(
  diag: RefreshDiagnostics,
  key: string
): Promise<string | null> {
  const opStart = performance.now()
  const result = await redis.get(key)
  const duration = performance.now() - opStart
  diag.redisOps.push({
    op: "get",
    key: key.replace(diag.userId, "<userId>"),
    startMs: opStart - diag.startTime,
    durationMs: Math.round(duration * 100) / 100,
    result: result ? "found" : "null",
  })
  return result as string | null
}

async function timedRedisDel(
  diag: RefreshDiagnostics,
  key: string
): Promise<number> {
  const opStart = performance.now()
  const result = await redis.del(key)
  const duration = performance.now() - opStart
  diag.redisOps.push({
    op: "del",
    key: key.replace(diag.userId, "<userId>"),
    startMs: opStart - diag.startTime,
    durationMs: Math.round(duration * 100) / 100,
    result: String(result),
  })
  return result
}

function logRefreshDiagnostics(diag: RefreshDiagnostics): void {
  if (!refreshDiagnosticsEnabled) return

  const totalRedisMs = diag.redisOps.reduce((sum, op) => sum + op.durationMs, 0)

  console.log(`
[REFRESH-DIAG] ═══════════════════════════════════════════════════════════════
[REFRESH-DIAG] TOKEN REFRESH: ${diag.callId}
[REFRESH-DIAG] ───────────────────────────────────────────────────────────────
[REFRESH-DIAG] User: ${diag.userId}
[REFRESH-DIAG] Outcome: ${diag.outcome}
[REFRESH-DIAG] Total Duration: ${diag.totalMs?.toFixed(2)}ms
[REFRESH-DIAG] Lock Attempts: ${diag.lockAttempts}
[REFRESH-DIAG] Redis Operations: ${diag.redisOps.length} (${totalRedisMs.toFixed(2)}ms total)
${diag.githubApiMs ? `[REFRESH-DIAG] GitHub API: ${diag.githubApiMs.toFixed(2)}ms` : ""}
${diag.error ? `[REFRESH-DIAG] Error: ${diag.error}` : ""}
[REFRESH-DIAG] ───────────────────────────────────────────────────────────────
[REFRESH-DIAG] Redis Operations Timeline:
${diag.redisOps.map((op) => `[REFRESH-DIAG]   +${op.startMs.toFixed(0).padStart(5)}ms  ${op.op.padEnd(8)} ${op.key.padEnd(30)} ${op.durationMs.toFixed(2).padStart(8)}ms  → ${op.result}`).join("\n")}
[REFRESH-DIAG] ═══════════════════════════════════════════════════════════════
`)

  // Store for API access
  recentRefreshDiagnostics.push(diag)
  if (recentRefreshDiagnostics.length > MAX_REFRESH_DIAGNOSTICS) {
    recentRefreshDiagnostics.shift()
  }
}

// ============================================================================
// Main refresh function with instrumentation
// ============================================================================

export async function refreshTokenWithLock(token: JWT) {
  const callId = generateRefreshCallId()
  const userId = token.sub || "unknown"
  const startTime = performance.now()

  const diag: RefreshDiagnostics = {
    callId,
    userId,
    startTime,
    outcome: "error",
    lockAttempts: 0,
    redisOps: [],
  }

  if (refreshDiagnosticsEnabled) {
    console.log(
      `[REFRESH-DIAG] ${callId} | START | userId=${userId} | tokenExpired=${token.expires_at ? (token.expires_at as number) < Date.now() / 1000 : "unknown"}`
    )
  }

  const lockKey = `token_refresh_lock_${token.sub}`
  const tokenKey = `token_${token.sub}`
  const lockTimeout = 10
  const retryDelay = 100
  const maxRetries = 50

  try {
    while (diag.lockAttempts < maxRetries) {
      diag.lockAttempts++

      // Try to acquire lock
      const lockAcquired = await timedRedisSetNx(
        diag,
        lockKey,
        "locked",
        lockTimeout
      )

      if (lockAcquired) {
        try {
          // Check if token was already refreshed by another instance
          const cachedToken = await timedRedisGet(diag, tokenKey)
          if (cachedToken) {
            try {
              const parsedToken =
                typeof cachedToken === "string"
                  ? JSON.parse(cachedToken)
                  : cachedToken

              if (parsedToken.authMethod !== "github-app") {
                await timedRedisDel(diag, tokenKey)
              } else {
                diag.outcome = "got-lock-cache-hit"
                return parsedToken
              }
            } catch (e) {
              console.error(
                `Error parsing cached token for key ${tokenKey}:`,
                e
              )
            }
          }

          if (token.authMethod !== "github-app") {
            throw new Error(
              "OAuth App token detected during refresh - please sign in again"
            )
          }

          // Refresh token using GitHub App credentials
          const githubStart = performance.now()
          const response = await fetch(
            "https://github.com/login/oauth/access_token",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Accept: "application/json",
              },
              body: new URLSearchParams({
                client_id: process.env.GITHUB_APP_CLIENT_ID ?? "",
                client_secret: process.env.GITHUB_APP_CLIENT_SECRET ?? "",
                refresh_token: (token.refresh_token as string) ?? "",
                grant_type: "refresh_token",
              }),
            }
          )
          const data = await response.json()
          diag.githubApiMs = performance.now() - githubStart

          if (data.error === "bad_refresh_token") {
            throw new Error("Bad refresh token")
          }

          const newToken = {
            ...token,
            ...data,
            authMethod: "github-app",
          }
          if (data.expires_in) {
            newToken.expires_at =
              Math.floor(Date.now() / 1000) + data.expires_in
          }

          await timedRedisSet(
            diag,
            tokenKey,
            JSON.stringify(newToken),
            newToken.expires_in || AUTH_CONFIG.tokenCacheTtlSeconds
          )

          diag.outcome = "got-lock-refreshed"
          return newToken
        } finally {
          await timedRedisDel(diag, lockKey)
        }
      } else {
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, retryDelay))
      }

      // After waiting, check if token is in Redis
      const cachedToken = await timedRedisGet(diag, tokenKey)
      if (cachedToken) {
        try {
          const parsedToken =
            typeof cachedToken === "string"
              ? JSON.parse(cachedToken)
              : cachedToken

          if (parsedToken.authMethod !== "github-app") {
            await timedRedisDel(diag, tokenKey)
          } else {
            diag.outcome = "waited-cache-hit"
            return parsedToken
          }
        } catch (e) {
          console.error(
            `Error parsing cached token for key ${tokenKey} after waiting:`,
            e
          )
        }
      }
    }

    // Fallback: if max retries reached, check Redis one last time
    const cachedToken = await timedRedisGet(diag, tokenKey)
    if (cachedToken) {
      try {
        const parsedToken =
          typeof cachedToken === "string"
            ? JSON.parse(cachedToken)
            : cachedToken

        if (parsedToken.authMethod !== "github-app") {
          await timedRedisDel(diag, tokenKey)
        } else {
          diag.outcome = "max-retries-cache-hit"
          return parsedToken
        }
      } catch (e) {
        console.error("Error parsing cached token after max retries:", e)
      }
    }

    diag.outcome = "max-retries-failed"
    throw new Error(
      "Max retries reached, assuming token refreshed by another instance"
    )
  } catch (error) {
    diag.error = error instanceof Error ? error.message : String(error)
    throw error
  } finally {
    diag.endTime = performance.now()
    diag.totalMs = Math.round((diag.endTime - diag.startTime) * 100) / 100
    logRefreshDiagnostics(diag)
  }
}
