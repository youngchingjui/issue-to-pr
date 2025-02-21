import NextAuth from "next-auth"
import { JWT } from "next-auth/jwt"
import GithubProvider from "next-auth/providers/github"

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
        return { ...token, ...account }
      }

      // Refresh token if it's expired
      if (
        token.expires_at &&
        (token.expires_at as number) < Date.now() / 1000
      ) {
        if (token.provider == "github") {
          console.log("Refreshing token")

          const response = await fetch(
            "https://github.com/login/oauth/access_token",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Accept: "application/json",
              },
              body: new URLSearchParams({
                client_id: process.env.AUTH_GITHUB_ID,
                client_secret: process.env.AUTH_GITHUB_SECRET,
                refresh_token: token.refresh_token as string,
                grant_type: "refresh_token",
              }),
            }
          )
          const data = await response.json()
          console.log("Refreshed token")
          console.log("token before update", token)
          console.log("data", data)

          if (data.error == "bad_refresh_token") {
            console.error("Bad refresh token")
            throw new Error("Bad refresh token")
          }

          const newToken = { ...token, ...data }
          if (data.expires_in) {
            newToken.expires_at =
              Math.floor(Date.now() / 1000) + data.expires_in
          }
          console.log("token after update", newToken)
          return newToken
        }
      }
      return token
    },
    async session({ session, token }) {
      session.token = token
      return session
    },
  },
})
