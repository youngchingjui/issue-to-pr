import { NextResponse } from "next/server"
import NextAuth from "next-auth"
import { JWT } from "next-auth/jwt"
import GithubProvider from "next-auth/providers/github"

import { redis } from "@/lib/redis"
import { refreshTokenWithLock } from "@/lib/utils-server"

declare module "next-auth" {
  interface Session {
    token?: JWT
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GithubProvider({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        const newToken = { ...token, ...account }
        if (account.expires_in) {
          newToken.expires_at =
            Math.floor(Date.now() / 1000) + account.expires_in
        }

        // Store initial token in Redis
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
            return NextResponse.redirect("/")
          }
        }
        throw new Error("Token expired")
      }
      return token
    },
    async session({ session, token }) {
      session.token = token
      return session
    },
  },
})
