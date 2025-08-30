import { NextResponse } from "next/server"
import NextAuth from "next-auth"
import { JWT } from "next-auth/jwt"
import GithubProvider from "next-auth/providers/github"

import { AUTH_CONFIG } from "@/lib/auth/config"
import { redis } from "@/lib/redis"
import { refreshTokenWithLock } from "@/lib/utils/auth"

export const runtime = "nodejs"

declare module "next-auth" {
  interface Session {
    token?: JWT
    authMethod?: "github-app" | "github-app-2"
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    authMethod?: "github-app" | "github-app-2"
  }
}

function getRedirectBaseUrl() {
  // Vercel staging
  switch (process.env.VERCEL_ENV) {
    case "production":
    case "development":
      return process.env.NEXT_PUBLIC_BASE_URL
    case "preview":
      return `https://${process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL}`
    default:
      return "http://localhost:3000"
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
      authorization: {
        url: "https://github.com/login/oauth/authorize",
        params: {
          client_id: process.env.GITHUB_APP_CLIENT_ID,
          redirect_uri: `${getRedirectBaseUrl()}/api/auth/callback/github-app`,
        },
      },
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
        }
      },
    }),
    // Basic second GitHub App provider for testing, without Redis/refresh logic
    GithubProvider({
      id: "github-app-2",
      name: "GitHub App 2",
      clientId: process.env.GITHUB_APP_CLIENT_ID,
      clientSecret: process.env.GITHUB_APP_CLIENT_SECRET,
      authorization: {
        url: "https://github.com/login/oauth/authorize",
        params: {
          client_id: process.env.GITHUB_APP_CLIENT_ID,
          redirect_uri: `${getRedirectBaseUrl()}/api/auth/callback/github-app-2`,
        },
      },
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
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        console.log("Auth info:", {
          provider: account.provider,
          type: account.type,
          tokenType: account.token_type,
          accessToken: !!account.access_token,
          scope: account.scope,
        })
        const authMethod = (account.provider as "github-app" | "github-app-2")
        const newToken: JWT & { expires_at?: number } = {
          ...token,
          ...account,
          // Store which auth method was used
          authMethod,
        }
        if (account.expires_in) {
          newToken.expires_at =
            Math.floor(Date.now() / 1000) + account.expires_in
        }

        // Only use Redis caching for the primary provider
        if (authMethod === "github-app") {
          await redis.set(`token_${token.sub}`, JSON.stringify(newToken), {
            ex: account.expires_in || AUTH_CONFIG.tokenCacheTtlSeconds,
          })
        }
        return newToken
      }

      // If this is a session from an unsupported/old auth method, force re-auth
      if (
        token.authMethod !== "github-app" &&
        token.authMethod !== "github-app-2"
      ) {
        console.log(
          "Invalidating session from unsupported auth method, forcing re-authentication"
        )
        throw new Error("Unsupported auth token detected - please sign in again")
      }

      // Handle token expiry differently based on provider
      if (
        token.expires_at &&
        (token.expires_at as number) < Date.now() / 1000
      ) {
        if (token.authMethod === "github-app" && token.refresh_token) {
          try {
            return await refreshTokenWithLock(token)
          } catch (error) {
            console.error("Error refreshing token. Sign in again", error)
            const url = new URL(
              "/",
              process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
            )
            return NextResponse.redirect(url)
          }
        }
        // For the basic provider, don't attempt refresh – just expire
        throw new Error("Token expired")
      }
      return token
    },
    async session({ session, token }) {
      session.token = token
      // Add auth method to session for frontend usage
      session.authMethod = token.authMethod as "github-app" | "github-app-2"
      return session
    },
  },
})

