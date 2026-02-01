/**
 * Simple Token Refresh - No Redis, Edge-compatible
 *
 * Just calls GitHub API to refresh the token.
 * React cache() handles request-level deduplication.
 */

import { JWT } from "next-auth/jwt"

interface RefreshResult {
  token: JWT
}

/**
 * Refresh a GitHub token using the refresh_token grant.
 * Works on Edge runtime (HTTP only, no Redis).
 */
export async function refreshToken(token: JWT): Promise<RefreshResult> {
  // Runtime guard for refresh_token
  const refreshTokenValue =
    typeof token.refresh_token === "string" ? token.refresh_token : null

  if (!refreshTokenValue) {
    throw new Error("No refresh token available")
  }

  // Validate env vars before making the API call
  const clientId = process.env.GITHUB_APP_CLIENT_ID
  const clientSecret = process.env.GITHUB_APP_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing GitHub App credentials (GITHUB_APP_CLIENT_ID or GITHUB_APP_CLIENT_SECRET)"
    )
  }

  // Call GitHub API to refresh
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshTokenValue,
      grant_type: "refresh_token",
    }),
  })

  const data = await response.json()

  if (data.error) {
    console.error("[REFRESH] GitHub API error:", data.error)
    throw new Error(
      data.error === "bad_refresh_token"
        ? "Bad refresh token - please sign in again"
        : `GitHub refresh error: ${data.error}`
    )
  }

  // Build new token
  const newToken: JWT = {
    ...token,
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? token.refresh_token,
    expires_at: data.expires_in
      ? Math.floor(Date.now() / 1000) + data.expires_in
      : token.expires_at,
  }

  return { token: newToken }
}
