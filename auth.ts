import { NextResponse } from "next/server"
import NextAuth from "next-auth"
import { JWT } from "next-auth/jwt"
import GithubProvider from "next-auth/providers/github"

import { redis } from "@/lib/redis"
import { refreshTokenWithLock } from "@/lib/utils/auth"

const WEEK_IN_SECONDS = 60 * 60 * 24 * 7

export const runtime = "nodejs"

declare module "next-auth" {
  interface Session {
    token?: JWT
    authMethod?: "github-app"
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    authMethod?: "github-app"
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
  ],
  session: {
    strategy: "jwt",
    maxAge: WEEK_IN_SECONDS,
  },
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
        const now = Math.floor(Date.now() / 1000)
        const newToken = {
          ...token,
          ...account,
          // Store which auth method was used
          authMethod: "github-app",
          refreshed_at: now,
        }
        if (account.expires_in) {
          newToken.expires_at = now + account.expires_in
        }

        await redis.set(`token_${token.sub}`, JSON.stringify(newToken), {
          ex: account.expires_in || 28800,
        })
        return newToken
      }

      const now = Math.floor(Date.now() / 1000)

      if (
        token.refreshed_at &&
        token.refreshed_at + WEEK_IN_SECONDS < now
      ) {
        if (token.provider === "github" || token.provider === "github-app") {
          try {
            const refreshed = await refreshTokenWithLock(token)
            refreshed.refreshed_at = now
            await redis.set(`token_${token.sub}`, JSON.stringify(refreshed), {
              ex: refreshed.expires_in || 28800,
            })
            return refreshed
          } catch (error) {
            console.error("Error refreshing token. Sign in again", error)
            const url = new URL(
              "/",
              process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
            )
            return NextResponse.redirect(url)
          }
        }
      }

      if (token.expires_at && token.expires_at < now) {
        if (token.provider === "github" || token.provider === "github-app") {
          try {
            const refreshed = await refreshTokenWithLock(token)
            refreshed.refreshed_at = now
            await redis.set(`token_${token.sub}`, JSON.stringify(refreshed), {
              ex: refreshed.expires_in || 28800,
            })
            return refreshed
          } catch (error) {
            console.error("Error refreshing token. Sign in again", error)
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
    async session({ session, token }) {
      session.token = token
      // Add auth method to session for frontend usage
      session.authMethod = token.authMethod
      return session
    },
  },
})
