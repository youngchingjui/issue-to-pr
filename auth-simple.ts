import { NextResponse } from "next/server"
import NextAuth from "next-auth"
import { JWT } from "next-auth/jwt"
import GithubProvider from "next-auth/providers/github"

// A minimal NextAuth config without Redis/locking for experimentation

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const response = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: new URLSearchParams({
          client_id: process.env.GITHUB_APP_CLIENT_ID ?? "",
          client_secret: process.env.GITHUB_APP_CLIENT_SECRET ?? "",
          refresh_token: (token.refresh_token as string) ?? "",
          grant_type: "refresh_token",
        }),
      }
    )

    const data = await response.json()
    if (!response.ok) {
      throw data
    }

    return {
      ...token,
      ...data,
      expires_at: data.expires_in
        ? Math.floor(Date.now() / 1000) + data.expires_in
        : token.expires_at,
    }
  } catch (error) {
    console.error("Error refreshing token", error)
    return { ...token, error: "RefreshAccessTokenError" as const }
  }
}

export const {
  handlers: simpleHandlers,
  auth: simpleAuth,
  signIn: simpleSignIn,
  signOut: simpleSignOut,
} = NextAuth({
  session: {
    strategy: "jwt",
  },
  providers: [
    GithubProvider({
      id: "github-app-simple",
      name: "GitHub App (Simple)",
      clientId: process.env.GITHUB_APP_CLIENT_ID,
      clientSecret: process.env.GITHUB_APP_CLIENT_SECRET,
      authorization: {
        url: "https://github.com/login/oauth/authorize",
        params: {
          client_id: process.env.GITHUB_APP_CLIENT_ID,
        },
      },
      userinfo: {
        url: "https://api.github.com/user",
        params: { installation_id: process.env.GITHUB_APP_INSTALLATION_ID },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        const newToken: JWT = {
          ...token,
          ...account,
        }
        if (account.expires_in) {
          newToken.expires_at =
            Math.floor(Date.now() / 1000) + account.expires_in
        }
        return newToken
      }

      if (
        token.expires_at &&
        (token.expires_at as number) < Date.now() / 1000
      ) {
        if (token.refresh_token) {
          return await refreshAccessToken(token)
        }
        const url = new URL(
          "/",
          process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
        )
        return NextResponse.redirect(url)
      }
      return token
    },
    async session({ session, token }) {
      session.token = token
      return session
    },
  },
})
