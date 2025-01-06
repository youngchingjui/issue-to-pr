import NextAuth, { DefaultSession, Session } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import axios from "axios";

// Allows us to attach accessToken to session.user with TypeScript
declare module "next-auth" {
  interface Session {
    user: {
      accessToken?: string;
    } & DefaultSession["user"];
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GithubProvider({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      authorization: {
        params: {
          scope: "read:user repo",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      const user = (session as Session).user;
      user.accessToken = token.accessToken as string;
      return session;
    },
  },
});

// In resolve.ts or any endpoint handler
import { getSession } from 'next-auth/react';

async function fetchUserRepos(req, res) {
  const session = await getSession({ req });

  if (!session || !session.user?.accessToken) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const response = await axios.get('https://api.github.com/user/repos', {
      headers: {
        Authorization: `token ${session.user.accessToken}`,
      },
    });

    res.status(200).json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      message: "Error fetching repositories",
    });
  }
}

export default fetchUserRepos;
