#!/usr/bin/env tsx

/**
 * One-time cleanup script to remove old OAuth App tokens from Redis
 * Run this after deploying the auth migration changes
 *
 * Usage: npx tsx scripts/cleanup-old-tokens.ts
 */

import { config as loadEnv } from "dotenv"
loadEnv({ path: ".env.local" })

import { redis } from "../lib/redis"

async function cleanupOldTokens() {
  console.log("Starting cleanup of old OAuth App tokens...")

  try {
    // Get all token keys from Redis
    const keys = await redis.keys("token_*")
    console.log(`Found ${keys.length} token keys in Redis`)

    let removedCount = 0
    let validCount = 0

    for (const key of keys) {
      try {
        const tokenData = await redis.get(key)

        if (tokenData) {
          const token =
            typeof tokenData === "string" ? JSON.parse(tokenData) : tokenData

          // Check if this is an old OAuth App token
          if (token.authMethod !== "github-app") {
            console.log(`Removing old OAuth App token: ${key}`)
            await redis.del(key)
            removedCount++
          } else {
            validCount++
          }
        }
      } catch (error) {
        console.error(`Error processing token ${key}:`, error)
        // Remove malformed tokens as well
        await redis.del(key)
        removedCount++
      }
    }

    console.log(`Cleanup complete:`)
    console.log(`- Removed ${removedCount} old/invalid tokens`)
    console.log(`- Kept ${validCount} valid GitHub App tokens`)
  } catch (error) {
    console.error("Error during cleanup:", error)
    process.exit(1)
  }
}

// Run the cleanup
cleanupOldTokens()
  .then(() => {
    console.log("Cleanup finished successfully")
    process.exit(0)
  })
  .catch((error) => {
    console.error("Cleanup failed:", error)
    process.exit(1)
  })
