/**
 * Auth Diagnostics API
 *
 * GET /api/auth-diagnostics - Get current token state
 * GET /api/auth-diagnostics?view=summaries - Get recent request summaries
 * GET /api/auth-diagnostics?view=refresh - Get recent refresh diagnostics
 * POST /api/auth-diagnostics?action=expire - Force token expiry
 * POST /api/auth-diagnostics?action=clear - Clear cached token
 * POST /api/auth-diagnostics?action=test-concurrent - Test concurrent auth calls
 * POST /api/auth-diagnostics?action=test-refresh - Expire then test concurrent (triggers refresh)
 */

import { NextResponse } from "next/server"

import {
  authWithDiagnostics,
  clearCachedToken,
  forceTokenExpiry,
  getRecentSummaries,
  getTokenDiagnostics,
  testRedisLatency,
  testRefreshLockContention,
  triggerForceRefresh,
} from "@/lib/auth/diagnostics"
import {
  clearRefreshDiagnostics,
  getRecentRefreshDiagnostics,
} from "@/lib/utils/auth"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const view = searchParams.get("view")

  if (view === "summaries") {
    // Return recent request summaries (auth() call timings)
    return NextResponse.json({
      summaries: getRecentSummaries(),
    })
  }

  if (view === "refresh") {
    // Return recent refresh diagnostics (detailed refresh flow)
    return NextResponse.json({
      refreshDiagnostics: getRecentRefreshDiagnostics(),
    })
  }

  if (view === "all") {
    // Return everything for debugging
    const [tokenState, summaries, refreshDiagnostics] = await Promise.all([
      getTokenDiagnostics(),
      Promise.resolve(getRecentSummaries()),
      Promise.resolve(getRecentRefreshDiagnostics()),
    ])
    return NextResponse.json({
      tokenState,
      summaries,
      refreshDiagnostics,
    })
  }

  // Default: return token diagnostics
  const diagnostics = await getTokenDiagnostics()
  return NextResponse.json(diagnostics)
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")

  switch (action) {
    case "expire":
      const expireResult = await forceTokenExpiry()
      return NextResponse.json(expireResult)

    case "clear":
      const clearResult = await clearCachedToken()
      return NextResponse.json(clearResult)

    case "test-concurrent": {
      // Simulate 3 concurrent auth calls like a page load
      const startTime = performance.now()

      const results = await Promise.all([
        authWithDiagnostics("test-concurrent-1"),
        authWithDiagnostics("test-concurrent-2"),
        authWithDiagnostics("test-concurrent-3"),
      ])

      const endTime = performance.now()
      const totalMs = endTime - startTime

      // Wait for summary to be recorded
      await new Promise((resolve) => setTimeout(resolve, 600))

      const summaries = getRecentSummaries()
      const latestSummary = summaries[summaries.length - 1]

      return NextResponse.json({
        success: true,
        totalMs: Math.round(totalMs * 100) / 100,
        hasSession: !!results[0],
        user: results[0]?.profile?.login ?? null,
        latestSummary,
      })
    }

    case "force-refresh": {
      // Just set the force refresh flag without testing
      const result = await triggerForceRefresh()
      return NextResponse.json(result)
    }

    case "test-refresh": {
      // Clear previous refresh diagnostics for clean results
      clearRefreshDiagnostics()

      // Set force refresh flag (works even without cached token in Redis)
      const forceResult = await triggerForceRefresh()
      if (!forceResult.success) {
        return NextResponse.json(forceResult)
      }

      // Now do concurrent auth calls - this should trigger refresh
      const startTime = performance.now()

      const results = await Promise.all([
        authWithDiagnostics("test-refresh-1"),
        authWithDiagnostics("test-refresh-2"),
        authWithDiagnostics("test-refresh-3"),
      ])

      const endTime = performance.now()
      const totalMs = endTime - startTime

      // Wait for summary to be recorded
      await new Promise((resolve) => setTimeout(resolve, 600))

      const summaries = getRecentSummaries()
      const latestSummary = summaries[summaries.length - 1]
      const refreshDiagnostics = getRecentRefreshDiagnostics()

      return NextResponse.json({
        success: true,
        scenario: "token-refresh",
        totalMs: Math.round(totalMs * 100) / 100,
        hasSession: !!results[0],
        user: results[0]?.profile?.login ?? null,
        latestSummary,
        refreshDiagnostics,
      })
    }

    case "clear-diagnostics": {
      // Clear all stored diagnostics
      clearRefreshDiagnostics()
      return NextResponse.json({
        success: true,
        message: "Refresh diagnostics cleared",
      })
    }

    case "test-lock-contention": {
      // Test Redis lock contention with concurrent calls
      const countParam = searchParams.get("count")
      const count = countParam ? parseInt(countParam, 10) : 3

      const result = await testRefreshLockContention(count)
      return NextResponse.json(result)
    }

    case "test-redis-latency": {
      // Test raw Redis operation latency
      const result = await testRedisLatency()
      return NextResponse.json(result)
    }

    default:
      return NextResponse.json(
        {
          error:
            "Unknown action. Available actions: expire, clear, force-refresh, test-concurrent, test-refresh, test-lock-contention, test-redis-latency, clear-diagnostics",
        },
        { status: 400 }
      )
  }
}
