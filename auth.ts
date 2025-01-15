import NextAuth, { DefaultSession, Session } from "next-auth"
import GithubProvider from "next-auth/providers/github"

// Allows us to attach accessToken to session.user with TypeScript
declare module "next-auth" {
  interface Session {
    user: {
      accessToken?: string
    } & DefaultSession["user"]
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GithubProvider({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      authorization: {
        params: {
          scope: process.env.AUTH_GITHUB_SCOPE || "read:user repo",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }) {
      const user = (session as Session).user
      user.accessToken = token.accessToken as string
      return session
    },
  },
})
