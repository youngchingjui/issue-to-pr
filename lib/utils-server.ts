// These utils are for server-side code
import "server-only"

import { AsyncLocalStorage } from "node:async_hooks"

import { JWT } from "next-auth/jwt"

import { auth } from "@/auth"
import { getLocalRepoDir } from "@/lib/fs"
import {
  cleanCheckout,
  cleanupRepo,
  cloneRepo,
  ensureValidRepo,
} from "@/lib/git"
import getOctokit from "@/lib/github"
import { redis } from "@/lib/redis"
import { getCloneUrlWithAccessToken } from "@/lib/utils"

// For storing Github App installation ID in async context
const asyncLocalStorage = new AsyncLocalStorage<{ installationId: string }>()

export function runWithInstallationId(
  installationId: string,
  fn: () => Promise<void>
) {
  asyncLocalStorage.run({ installationId }, fn)
}

export function getInstallationId(): string | null {
  const store = asyncLocalStorage.getStore()
  if (!store) {
    return null
  }
  return store.installationId
}

export async function setupLocalRepository({
  repoFullName,
  workingBranch = "main",
}: {
  repoFullName: string
  workingBranch?: string
}): Promise<string> {
  // Get or create a local directory to work off of
  const baseDir = await getLocalRepoDir(repoFullName)

  try {
    let cloneUrl: string

    // First try user session authentication
    const session = await auth()
    if (session?.token?.access_token) {
      cloneUrl = getCloneUrlWithAccessToken(
        repoFullName,
        session.token.access_token as string
      )
    } else {
      // Fallback to GitHub App authentication
      const octokit = await getOctokit()
      if (!octokit) {
        throw new Error("Failed to get authenticated Octokit instance")
      }

      // Get the repository details to get the clone URL
      const [owner, repo] = repoFullName.split("/")
      const { data: repoData } = await octokit.rest.repos.get({
        owner,
        repo,
      })

      cloneUrl = repoData.clone_url as string

      // If we have an installation ID, modify the clone URL to use the installation token
      const installationId = getInstallationId()
      if (installationId) {
        const token = (await octokit.auth({
          type: "installation",
          installationId: Number(installationId),
        })) as { token: string }
        cloneUrl = getCloneUrlWithAccessToken(repoFullName, token.token)
      }
    }

    // Check repository state and repair if needed
    await ensureValidRepo(baseDir, cloneUrl)

    // Try clean checkout with retries
    let retries = 3
    while (retries > 0) {
      try {
        await cleanCheckout(workingBranch, baseDir)
        break
      } catch (error) {
        retries--
        if (retries === 0) {
          console.error(
            `[ERROR] Failed to clean checkout after retries: ${error.message}`
          )
          throw error
        }
        console.warn(
          `[WARNING] Clean checkout failed, retrying... (${retries} attempts left)`
        )
        await cleanupRepo(baseDir)
        await cloneRepo(cloneUrl, baseDir)
      }
    }

    return baseDir
  } catch (error) {
    console.error(`[ERROR] Failed to setup repository: ${error.message}`)
    // Clean up on failure
    await cleanupRepo(baseDir)
    throw error
  }
}

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

            // Validate the cached token
            if (parsedToken.error || !parsedToken.access_token) {
              console.log("Invalid cached token, removing from Redis")
              await redis.del(tokenKey)
              throw new Error("Invalid cached token")
            }

            return parsedToken
          } catch (e) {
            console.error(`Error parsing cached token for key ${tokenKey}:`, e)
            // If parsing fails or token is invalid, remove it and continue with refresh
            await redis.del(tokenKey)
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
              client_id: process.env.AUTH_GITHUB_ID,
              client_secret: process.env.AUTH_GITHUB_SECRET,
              refresh_token: token.refresh_token as string,
              grant_type: "refresh_token",
            }),
          }
        )

        if (!response.ok) {
          throw new Error(`Token refresh failed with status ${response.status}`)
        }

        const data = await response.json()

        console.log("token before update", token)
        console.log("data", data)

        if (data.error) {
          console.error("Token refresh error:", data.error)
          // Clean up invalid token from Redis
          await redis.del(tokenKey)
          throw new Error(data.error)
        }

        const newToken = { ...token, ...data }
        if (data.expires_in) {
          newToken.expires_at = Math.floor(Date.now() / 1000) + data.expires_in
        }
        console.log("token after update", newToken)
        console.log("Refreshed token")

        // Store the refreshed token in Redis with an expiration
        await redis.set(tokenKey, JSON.stringify(newToken), {
          ex: newToken.expires_in || 28800,
        })
        return newToken
      } catch (error) {
        // Clean up the lock and rethrow
        await redis.del(lockKey)
        throw error
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

        // Validate the cached token
        if (parsedToken.error || !parsedToken.access_token) {
          console.log("Invalid cached token after waiting, removing from Redis")
          await redis.del(tokenKey)
          throw new Error("Invalid cached token")
        }

        return parsedToken
      } catch (e) {
        console.error(
          `Error parsing cached token for key ${tokenKey} after waiting:`,
          e
        )
        // If parsing fails or token is invalid, remove it
        await redis.del(tokenKey)
        throw e
      }
    }
  }

  throw new Error("Max retries reached while refreshing token")
}
