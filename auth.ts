import { NextResponse } from "next/server"
import NextAuth from "next-auth"
import { JWT } from "next-auth/jwt"
import GithubProvider from "next-auth/providers/github"

import { AUTH_CONFIG } from "@/lib/auth/config"
import { redis } from "@/lib/redis"
import { refreshTokenWithLock } from "@/lib/utils/auth"

export const runtime = "nodejs"

// ============================================================================
// JWT Callback Diagnostics
// ============================================================================

const JWT_DIAG_ENABLED = true // Set to false to disable JWT callback logging

interface JwtCallbackDiagnostics {
  callId: string
  startTime: number
  trigger: string
  userId?: string
  path:
    | "sign-in"
    | "invalid-auth-method"
    | "token-expired-refreshing"
    | "token-expired-no-refresh-token"
    | "token-valid"
    | "force-refresh"
    | "error"
  tokenExpired: boolean
  forceRefreshFlag: boolean
  refreshTriggered: boolean
  redisOps: Array<{ op: string; durationMs: number }>
  totalMs?: number
  error?: string
}

let jwtCallCounter = 0
function generateJwtCallId(): string {
  return `jwt-${Date.now()}-${++jwtCallCounter}`
}

// Check if force refresh flag is set in Redis
async function checkForceRefreshFlag(userId: string): Promise<boolean> {
  const flagKey = `force_refresh_${userId}`
  const flag = await redis.get(flagKey)
  if (flag) {
    // Clear the flag after reading
    await redis.del(flagKey)
    return true
  }
  return false
}

// Set force refresh flag (called from diagnostics API)
export async function setForceRefreshFlag(userId: string): Promise<void> {
  const flagKey = `force_refresh_${userId}`
  await redis.set(flagKey, "1", { ex: 60 }) // Expires in 60 seconds
}

function logJwtDiagnostics(diag: JwtCallbackDiagnostics): void {
  if (!JWT_DIAG_ENABLED) return

  const redisTime = diag.redisOps.reduce((sum, op) => sum + op.durationMs, 0)

  console.log(`[JWT-DIAG] ${diag.callId} | path=${diag.path} | userId=${diag.userId ?? "none"} | expired=${diag.tokenExpired} | forceRefresh=${diag.forceRefreshFlag} | refreshTriggered=${diag.refreshTriggered} | totalMs=${diag.totalMs?.toFixed(2)} | redisMs=${redisTime.toFixed(2)}${diag.error ? ` | error=${diag.error}` : ""}`)
}

declare module "next-auth" {
  interface Session {
    token?: JWT
    authMethod?: "github-app"
    profile?: { login: string }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    authMethod?: "github-app"
    profile?: { login: string }
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: AUTH_CONFIG.sessionMaxAgeSeconds,
  },
  providers: [
    GithubProvider({
      id: "github-app",
      name: "GitHub App",
      clientId: process.env.GITHUB_APP_CLIENT_ID, // GitHub App credentials
      clientSecret: process.env.GITHUB_APP_CLIENT_SECRET,
      // Let NextAuth compute the correct redirect_uri based on the incoming request.
      // Overriding redirect_uri can break PKCE if the domain does not match the actual host handling the callback.
      userinfo: {
        url: "https://api.github.com/user",
        params: { installation_id: process.env.GITHUB_APP_INSTALLATION_ID },
      },
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: profile.name || profile.login,
          email: profile.email,
          image: profile.avatar_url,
          username: profile.login,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user, profile, trigger, session }) {
      const callId = generateJwtCallId()
      const startTime = performance.now()
      const diag: JwtCallbackDiagnostics = {
        callId,
        startTime,
        trigger: trigger ?? "unknown",
        userId: token.sub,
        path: "token-valid",
        tokenExpired: false,
        forceRefreshFlag: false,
        refreshTriggered: false,
        redisOps: [],
      }

      try {
        // Sign-in flow: account is present
        if (account) {
          diag.path = "sign-in"
          console.log("Auth info:", {
            provider: account.provider,
            type: account.type,
            tokenType: account.token_type,
            accessToken: !!account.access_token,
            scope: account.scope,
          })
          const newToken = {
            ...token,
            ...account,
            profile: { login: profile?.login },
            authMethod: "github-app",
          }
          if (account.expires_in) {
            newToken.expires_at =
              Math.floor(Date.now() / 1000) + account.expires_in
          }

          const redisStart = performance.now()
          await redis.set(`token_${token.sub}`, JSON.stringify(newToken), {
            ex: account.expires_in || AUTH_CONFIG.tokenCacheTtlSeconds,
          })
          diag.redisOps.push({
            op: "set(token)",
            durationMs: performance.now() - redisStart,
          })

          return newToken
        }

        // Check if this is an old OAuth App token (migration cleanup)
        if (token.authMethod !== "github-app") {
          diag.path = "invalid-auth-method"
          console.log(
            "Invalidating old OAuth App token, forcing re-authentication"
          )
          throw new Error("OAuth App token detected - please sign in again")
        }

        // Check for force refresh flag in Redis (wrapped in try-catch to not break auth)
        let forceRefresh = false
        if (token.sub) {
          try {
            const forceRefreshStart = performance.now()
            forceRefresh = await checkForceRefreshFlag(token.sub)
            diag.redisOps.push({
              op: "check(force_refresh)",
              durationMs: performance.now() - forceRefreshStart,
            })
          } catch (e) {
            console.error("[JWT-DIAG] Error checking force refresh flag:", e)
            // Continue without force refresh on error
          }
        }
        diag.forceRefreshFlag = forceRefresh

        // Check if token is expired OR force refresh flag is set
        const tokenExpired =
          token.expires_at && (token.expires_at as number) < Date.now() / 1000
        diag.tokenExpired = !!tokenExpired

        if (tokenExpired || forceRefresh) {
          if (forceRefresh) {
            diag.path = "force-refresh"
            console.log(
              `[JWT-DIAG] Force refresh flag detected for user ${token.sub}`
            )
          } else {
            diag.path = "token-expired-refreshing"
          }

          // Try to refresh when we have a refresh token available
          if (token.refresh_token) {
            diag.refreshTriggered = true
            try {
              console.log("Refreshing token", {
                provider: token.provider,
                sub: token.sub,
                expires_at: token.expires_at,
                forceRefresh,
              })
              return await refreshTokenWithLock(token)
            } catch (error) {
              diag.path = "error"
              diag.error = error instanceof Error ? error.message : String(error)
              console.error("Error refreshing token. Sign in again", error)
              const url = new URL(
                "/",
                process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
              )
              return NextResponse.redirect(url)
            }
          }
          diag.path = "token-expired-no-refresh-token"
          throw new Error("Token expired")
        }

        diag.path = "token-valid"
        return token
      } finally {
        diag.totalMs = performance.now() - startTime
        logJwtDiagnostics(diag)
      }
    },
    async session({ session, token, user }) {
      session.token = token
      // Add auth method to session for frontend usage
      session.authMethod = token.authMethod
      session.profile = token.profile
      return session
    },
  },
})
