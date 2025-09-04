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
    authMethod?: "github-app"
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    authMethod?: "github-app"
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
        const newToken = {
          ...token,
          ...account,
          // Store which auth method was used
          authMethod: "github-app",
        }
        if (account.expires_in) {
          newToken.expires_at =
            Math.floor(Date.now() / 1000) + account.expires_in
        }

        await redis.set(`token_${token.sub}`, JSON.stringify(newToken), {
          ex: account.expires_in || AUTH_CONFIG.tokenCacheTtlSeconds,
        })
        return newToken
      }

      // Check if this is an old OAuth App token (migration cleanup)
      if (token.authMethod !== "github-app") {
        console.log(
          "Invalidating old OAuth App token, forcing re-authentication"
        )
        throw new Error("OAuth App token detected - please sign in again")
      }

      if (
        token.expires_at &&
        (token.expires_at as number) < Date.now() / 1000
      ) {
        // Try to refresh when we have a refresh token available
        if (token.refresh_token) {
          try {
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
    async session({ session, token }) {
      session.token = token
      // Add auth method to session for frontend usage
      session.authMethod = token.authMethod
      return session
    },
  },
})

