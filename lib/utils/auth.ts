import { JWT } from "next-auth/jwt"

import { AUTH_CONFIG } from "@/lib/auth/config"
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
            const parsedToken =
              typeof cachedToken === "string"
                ? JSON.parse(cachedToken)
                : cachedToken

            // Validate that cached token has proper auth method
            if (parsedToken.authMethod !== "github-app") {
              console.log(
                "Cached token is from old OAuth App, removing from cache"
              )
              await redis.del(tokenKey)
              // Continue with refresh attempt
            } else {
              return parsedToken
            }
          } catch (e) {
            console.error(`Error parsing cached token for key ${tokenKey}:`, e)
            // If parsing fails, continue with refresh
          }
        }

        // Check if this is an old OAuth App token before attempting refresh
        if (token.authMethod !== "github-app") {
          console.log("Cannot refresh old OAuth App token, invalidating")
          throw new Error(
            "OAuth App token detected during refresh - please sign in again"
          )
        }

        // Refresh token using GitHub App credentials
        console.log("Refreshing GitHub App token")
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

        if (data.error === "bad_refresh_token") {
          console.error("Bad refresh token")
          throw new Error("Bad refresh token")
        }

        const newToken = {
          ...token,
          ...data,
          // Ensure the auth method is preserved after refresh
          authMethod: "github-app",
        }
        if (data.expires_in) {
          newToken.expires_at = Math.floor(Date.now() / 1000) + data.expires_in
        }

        // Store the refreshed token in Redis with an expiration
        await redis.set(tokenKey, JSON.stringify(newToken), {
          ex: newToken.expires_in || AUTH_CONFIG.tokenCacheTtlSeconds,
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
        const parsedToken =
          typeof cachedToken === "string"
            ? JSON.parse(cachedToken)
            : cachedToken

        // Validate that cached token has proper auth method
        if (parsedToken.authMethod !== "github-app") {
          console.log(
            "Cached token after waiting is from old OAuth App, removing from cache"
          )
          await redis.del(tokenKey)
          // Continue with retries
        } else {
          return parsedToken
        }
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
      const parsedToken =
        typeof cachedToken === "string" ? JSON.parse(cachedToken) : cachedToken

      // Validate that cached token has proper auth method
      if (parsedToken.authMethod !== "github-app") {
        console.log(
          "Final cached token is from old OAuth App, removing from cache"
        )
        await redis.del(tokenKey)
        // Don't return the token, let it throw the error below
      } else {
        return parsedToken
      }
    } catch (e) {
      console.error("Error parsing cached token after max retries:", e)
    }
  }

  throw new Error(
    "Max retries reached, assuming token refreshed by another instance"
  )
}
