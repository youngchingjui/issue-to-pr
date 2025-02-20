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

function isTokenExpired(tokenExpiry: number): boolean {
  const currentTime = Math.floor(Date.now() / 1000); // current time in seconds
  return tokenExpiry < currentTime;
}

function isTokenNearExpiry(tokenExpiry: number, threshold: number = 300): boolean { // default to 5 minutes
  const currentTime = Math.floor(Date.now() / 1000);
  return tokenExpiry - currentTime < threshold;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GithubProvider({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      if (account) {
        token.accessToken = account.access_token;
        token.accessTokenExpiry = account.expires_at; // Assuming expires_at is in seconds
      }

      if (isTokenExpired(token.accessTokenExpiry)) {
        console.warn('Token expired, user needs to re-authenticate.');
        token.accessToken = undefined; // Clear the expired token
      } else if (isTokenNearExpiry(token.accessTokenExpiry)) {
        console.info('Token is near expiry. Please consider re-authenticating soon.');
      }

      return token;
    },
    async session({ session, token }) {
      const user = (session as Session).user;
      user.accessToken = token.accessToken as string;

      if (!user.accessToken) {
        console.warn('Session does not have a valid access token.');
        // Optionally, you could redirect or prompt the user to reauthenticate
      }

      return session;
    },
  },
});
