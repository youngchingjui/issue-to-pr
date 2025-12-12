import { NextResponse } from "next/server"
import NextAuth from "next-auth"
import { JWT } from "next-auth/jwt"
import GithubProvider from "next-auth/providers/github"
import Credentials from "next-auth/providers/credentials"

import { AUTH_CONFIG } from "@/lib/auth/config"
import { redis } from "@/lib/redis"
import { verifyEmailPassword } from "@/lib/neo4j/services/auth"
import { refreshTokenWithLock } from "@/lib/utils/auth"

export const runtime = "nodejs"

declare module "next-auth" {
  interface Session {
    token?: JWT
    authMethod?: "github-app" | "email-password"
    profile?: { login: string }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    authMethod?: "github-app" | "email-password"
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
    Credentials({
      id: "email-password",
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = String(credentials?.email ?? "").trim()
        const password = String(credentials?.password ?? "")
        if (!email || !password) return null
        const res = await verifyEmailPassword({ email, password })
        if (!res.ok) return null
        return {
          id: res.user.id, // use email as ID
          name: res.user.name,
          email: res.user.email,
          username: res.user.email,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user, profile, trigger, session }) {
      // If signing in (account exists), attach provider-specific info
      if (account) {
        if (account.provider === "email-password") {
          const newToken = {
            ...token,
            sub: user?.id ?? token.sub,
            email: user?.email ?? token.email,
            profile: { login: (user as any)?.email ?? token.email ?? "" },
            authMethod: "email-password" as const,
          }
          await redis.set(`token_${newToken.sub}`, JSON.stringify(newToken), {
            ex: AUTH_CONFIG.tokenCacheTtlSeconds,
          })
          return newToken
        }
        // GitHub app provider
        if (account.provider === "github-app") {
          console.log("Auth info:", {
            provider: account.provider,
            type: account.type,
            tokenType: (account as any).token_type,
            accessToken: !!(account as any).access_token,
            scope: (account as any).scope,
          })
          const newToken = {
            ...token,
            ...account,
            profile: { login: profile?.login },
            // Store which auth method was used
            authMethod: "github-app" as const,
          }
          if ((account as any).expires_in) {
            ;(newToken as any).expires_at =
              Math.floor(Date.now() / 1000) + (account as any).expires_in
          }

          await redis.set(`token_${token.sub}`, JSON.stringify(newToken), {
            ex: (account as any).expires_in || AUTH_CONFIG.tokenCacheTtlSeconds,
          })
          return newToken
        }
      }

      // For existing sessions, invalidate only legacy OAuth tokens without our supported authMethod
      if (
        token.authMethod &&
        token.authMethod !== "github-app" &&
        token.authMethod !== "email-password"
      ) {
        console.log(
          "Invalidating unsupported auth token, forcing re-authentication"
        )
        throw new Error("Unsupported auth token detected - please sign in again")
      }

      // Handle refresh for providers that support it (GitHub App)
      if (
        token.authMethod === "github-app" &&
        token.expires_at &&
        (token.expires_at as number) < Date.now() / 1000
      ) {
        // Try to refresh when we have a refresh token available
        if ((token as any).refresh_token) {
          try {
            console.log("Refreshing token", {
              provider: (token as any).provider,
              sub: token.sub,
              expires_at: (token as any).expires_at,
            })
            return await refreshTokenWithLock(token)
          } catch (error) {
            console.error("Error refreshing token. Sign in again", error)
            // Use NextURL for proper URL handling
            const url = new URL(
              "/",
              process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
            )
            return NextResponse.redirect(url)
          }
        }
        throw new Error("Token expired")
      }
      return token
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

