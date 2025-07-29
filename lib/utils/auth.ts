import { JWT } from "next-auth/jwt"

import { redis } from "@/lib/redis"

export async function refreshTokenWithLock(token: JWT) {
  const lockKey = `token_refresh_lock_${token.sub}` // Prevents concurrent refreshes for the same user
  const tokenKey = `token_${token.sub}`
  const lockTimeout = 10
  const retryDelay = 100
  const maxRetries = 50

  let attempts = 0

  while (attempts < maxRetries) {
    // Try to acquire lock
    const lockAcquired = await redis.set(lockKey, "locked", {
      ex: lockTimeout, // Expire time
      nx: true, // Only set if key doesn't exist
    })

    if (lockAcquired) {
      try {
        // Check if token was already refreshed by another instance
        const cachedToken = await redis.get(tokenKey)
        if (cachedToken) {
          console.log("Using cached token from Redis")
          try {
            return typeof cachedToken === "string"
              ? JSON.parse(cachedToken)
              : cachedToken
          } catch (e) {
            console.error(`Error parsing cached token for key ${tokenKey}:`, e)
            // If parsing fails, continue with refresh
          }
        }

        // Refresh token
        console.log("Refreshing token")
        const response = await fetch(
          "https://github.com/login/oauth/access_token",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Accept: "application/json",
            },
            body: new URLSearchParams({
              client_id: process.env.AUTH_GITHUB_ID ?? "",
              client_secret: process.env.AUTH_GITHUB_SECRET ?? "",
              refresh_token: (token.refresh_token as string) ?? "",
              grant_type: "refresh_token",
            }),
          }
        )
        const data = await response.json()

        if (data.error === "bad_refresh_token") {
          console.error("Bad refresh token")
          throw new Error("Bad refresh token")
        }

        const now = Math.floor(Date.now() / 1000)
        const newToken = { ...token, ...data, refreshed_at: now }
        if (data.expires_in) {
          newToken.expires_at = now + data.expires_in
        }

        // Store the refreshed token in Redis with an expiration
        await redis.set(tokenKey, JSON.stringify(newToken), {
          ex: newToken.expires_in || 28800,
        })
        return newToken
      } finally {
        await redis.del(lockKey)
      }
    } else {
      attempts++
      await new Promise((resolve) => setTimeout(resolve, retryDelay))
    }

    // After waiting, check if token is in Redis
    const cachedToken = await redis.get(tokenKey)
    if (cachedToken) {
      console.log("Using cached token from Redis after waiting")
      try {
        return typeof cachedToken === "string"
          ? JSON.parse(cachedToken)
          : cachedToken
      } catch (e) {
        console.error(
          `Error parsing cached token for key ${tokenKey} after waiting:`,
          e
        )
        // If parsing fails, continue with retries
      }
    }
  }

  // Fallback: if max retries reached, check Redis one last time
  const cachedToken = await redis.get(tokenKey)
  if (cachedToken) {
    console.log("Using cached token from Redis after max retries")
    try {
      return typeof cachedToken === "string"
        ? JSON.parse(cachedToken)
        : cachedToken
    } catch (e) {
      console.error("Error parsing cached token after max retries:", e)
    }
  }

  throw new Error(
    "Max retries reached, assuming token refreshed by another instance"
  )
}
