/**
 * NextAuth Configuration
 *
 * Simplified auth flow - no Redis dependency.
 * Works on both Edge and Node.js runtimes.
 * React cache() handles request-level deduplication.
 */

import NextAuth from "next-auth"
import { JWT } from "next-auth/jwt"
import GithubProvider from "next-auth/providers/github"

import { AUTH_CONFIG } from "@/lib/auth/config"
import { refreshToken } from "@/lib/auth/refresh-token"

declare module "next-auth" {
  interface Session {
    token?: JWT
    profile?: { login: string }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
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
    async jwt({ token, account, profile, trigger }) {
      try {
        // Sign-in or sign-up: store tokens from account
        if (trigger === "signIn" || trigger === "signUp") {
          const login = typeof profile?.login === "string" ? profile.login : ""

          const newToken: JWT = {
            ...token,
            access_token: account?.access_token,
            refresh_token: account?.refresh_token,
            expires_at: account?.expires_in
              ? Math.floor(Date.now() / 1000) + account.expires_in
              : undefined,
            profile: { login },
          }
          return newToken
        }

        // Check if token is expired
        const now = Math.floor(Date.now() / 1000)
        const expiresAt =
          typeof token.expires_at === "number" ? token.expires_at : undefined
        const isExpired = expiresAt && expiresAt < now

        if (isExpired) {
          // Refresh the token
          const { token: newToken } = await refreshToken(token)

          return newToken
        }

        return token
      } catch (error) {
        throw error
      }
    },

    async session({ session, token }) {
      session.token = token
      session.profile = token.profile
      return session
    },
  },
})
