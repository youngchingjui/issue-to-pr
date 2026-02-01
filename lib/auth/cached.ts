/**
 * Cached Auth
 *
 * Wraps auth() with React's cache() to deduplicate concurrent calls
 * within the same request.
 *
 * Without cache(): 3 components calling auth() = 3 JWT callback invocations
 * With cache(): 3 components calling auth() = 1 JWT callback, result shared
 */

import { cache } from "react"

import { auth as originalAuth } from "@/auth"

/**
 * Cached version of auth() - use this in React Server Components.
 */
export const auth = cache(async () => {
  return originalAuth()
})
