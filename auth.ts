import { NextResponse } from "next/server"
import NextAuth from "next-auth"
import { JWT } from "next-auth/jwt"
import GithubProvider from "next-auth/providers/github"

import { redis } from "@/lib/redis"
import { refreshTokenWithLock } from "@/lib/utils-server"

export const runtime = "nodejs"

declare module "next-auth" {
  interface Session {
    token?: JWT
    authMethod?: "oauth" | "github-app"
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    authMethod?: "oauth" | "github-app"
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    // Traditional OAuth provider for public repository access
    GithubProvider({
      id: "github-oauth",
      name: "GitHub OAuth",
      clientId: process.env.GITHUB_OAUTH_ID, // Regular OAuth app credentials
      clientSecret: process.env.GITHUB_OAUTH_SECRET,
      authorization: {
        url: "https://github.com/login/oauth/authorize",
        params: {
          scope: "read:user user:email public_repo",
          redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback/github-oauth`,
        },
      },
    }),
    // GitHub App provider for installed repositories
    GithubProvider({
      id: "github-app",
      name: "GitHub App",
      clientId: process.env.GITHUB_APP_CLIENT_ID, // GitHub App credentials
      clientSecret: process.env.GITHUB_APP_CLIENT_SECRET,
      authorization: {
        url: "https://github.com/login/oauth/authorize",
        params: {
          client_id: process.env.GITHUB_APP_CLIENT_ID,
          redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback/github-app`,
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
        const newToken = {
          ...token,
          ...account,
          // Store which auth method was used
          authMethod:
            account.provider === "github-oauth" ? "oauth" : "github-app",
        }
        if (account.expires_in) {
          newToken.expires_at =
            Math.floor(Date.now() / 1000) + account.expires_in
        }

        await redis.set(`token_${token.sub}`, JSON.stringify(newToken), {
          ex: account.expires_in || 28800,
        })
        return newToken
      }

      if (
        token.expires_at &&
        (token.expires_at as number) < Date.now() / 1000
      ) {
        if (token.provider == "github") {
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
