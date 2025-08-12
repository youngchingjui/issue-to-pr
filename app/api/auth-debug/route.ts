import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { redis } from "@/lib/redis"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const session = await auth()
  const userId = session?.user?.id || session?.token?.sub
  const tokenKey = userId ? `token_${userId}` : undefined

  let rawToken: unknown = null
  let ttl: number | null = null
  if (tokenKey) {
    rawToken = await redis.get(tokenKey)
    ttl = await redis.ttl(tokenKey)
  }

  return NextResponse.json({
    userId: userId ?? null,
    tokenKey: tokenKey ?? null,
    ttlSeconds: typeof ttl === "number" ? ttl : null,
    token: rawToken ?? null,
  })
}

export async function POST(request: Request) {
  const session = await auth()
  const userId = session?.user?.id ?? session?.token?.sub
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  const tokenKey = `token_${userId}`
  const body = await request.json().catch(() => ({}))
  const action = body?.action as
    | "set-ttl"
    | "expire"
    | "delete"
    | "get"
    | "bump-expiry"
    | "set-expires-at"
    | undefined

  if (!action) {
    return NextResponse.json(
      {
        error:
          "Missing action. Use one of: get, set-ttl, expire, delete, bump-expiry",
      },
      { status: 400 }
    )
  }

  if (action === "get") {
    const [rawToken, ttl] = await Promise.all([
      redis.get(tokenKey),
      redis.ttl(tokenKey),
    ])
    return NextResponse.json({ tokenKey, ttlSeconds: ttl, token: rawToken })
  }

  if (action === "delete") {
    await redis.del(tokenKey)
    return NextResponse.json({ ok: true })
  }

  if (action === "expire") {
    await redis.expire(tokenKey, 1)
    return NextResponse.json({ ok: true, ttlSeconds: 1 })
  }

  if (action === "bump-expiry") {
    const rawToken = await redis.get(tokenKey)
    if (!rawToken)
      return NextResponse.json({ error: "No token in cache" }, { status: 404 })
    // Re-set the same string with a short TTL to test behavior
    const value =
      typeof rawToken === "string" ? rawToken : JSON.stringify(rawToken)
    await redis.set(tokenKey, value, { ex: 60 })
    return NextResponse.json({ ok: true, ttlSeconds: 60 })
  }

  if (action === "set-ttl") {
    const ttl = Number.parseInt(String(body?.ttlSeconds ?? ""), 10)
    if (!Number.isFinite(ttl) || ttl <= 0) {
      return NextResponse.json({ error: "Invalid ttlSeconds" }, { status: 400 })
    }
    await redis.expire(tokenKey, ttl)
    return NextResponse.json({ ok: true, ttlSeconds: ttl })
  }

  if (action === "set-expires-at") {
    // Accept either absolute unix seconds or a delta in seconds from now
    const unixSecondsRaw = body?.unixSeconds
    const deltaSecondsRaw = body?.deltaSeconds
    const now = Math.floor(Date.now() / 1000)
    let targetExp: number | null = null
    if (Number.isFinite(unixSecondsRaw)) {
      targetExp = Number(unixSecondsRaw)
    } else if (Number.isFinite(deltaSecondsRaw)) {
      targetExp = now + Number(deltaSecondsRaw)
    }
    if (!Number.isFinite(targetExp) || targetExp === null) {
      return NextResponse.json(
        { error: "Provide unixSeconds or deltaSeconds (both numbers)" },
        { status: 400 }
      )
    }
    const currentTtl = await redis.ttl(tokenKey)
    const rawToken = await redis.get(tokenKey)
    if (!rawToken)
      return NextResponse.json({ error: "No token in cache" }, { status: 404 })
    let tokenObj: Record<string, unknown> & {
      expires_at?: number
      expires_in?: number
      authMethod?: "github-app"
    }
    try {
      tokenObj =
        typeof rawToken === "string"
          ? (JSON.parse(rawToken) as Record<string, unknown>)
          : (rawToken as Record<string, unknown>)
    } catch {
      return NextResponse.json(
        { error: "Cached token is not valid JSON" },
        { status: 500 }
      )
    }
    tokenObj.expires_at = targetExp
    const computedExpiresIn = targetExp - now
    if (Number.isFinite(computedExpiresIn)) {
      tokenObj.expires_in = computedExpiresIn
    }
    if (currentTtl && currentTtl > 0) {
      await redis.set(tokenKey, JSON.stringify(tokenObj), { ex: currentTtl })
    } else {
      await redis.set(tokenKey, JSON.stringify(tokenObj))
    }
    return NextResponse.json({
      ok: true,
      newExpiresAt: targetExp,
      newExpiresIn: tokenObj.expires_in,
      appliedTtlSeconds: currentTtl > 0 ? currentTtl : null,
    })
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 })
}
