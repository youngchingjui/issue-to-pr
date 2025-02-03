import NextAuth, { DefaultSession, Session } from "next-auth"
import GithubProvider from "next-auth/providers/github"
import jwt from 'jsonwebtoken'; // Import JSON Web Token library
import axios from 'axios'; // Import axios for HTTP requests

// Allows us to attach accessToken and installationToken to session.user with TypeScript
declare module "next-auth" {
  interface Session {
    user: {
      accessToken?: string,
      installationToken?: string
    } & DefaultSession["user"]
  }
}

// Function to generate a GitHub App JWT
function generateGitHubAppJWT() {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, '\n');

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now,
    exp: now + (10 * 60), // JWT expiration set to 10 minutes
    iss: appId
  };

  return jwt.sign(payload, privateKey, { algorithm: 'RS256' });
}

// Function to fetch the installation token
async function fetchInstallationToken(installationId: string) {
  const jwt = generateGitHubAppJWT();
  const response = await axios.post(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {},
    {
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github.v3+json'
      }
    }
  );
  return response.data.token;
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
      
      // Fetch and include the GitHub App installation token if applicable
      if (process.env.GITHUB_APP_INSTALLATION_ID) {
        token.installationToken = await fetchInstallationToken(process.env.GITHUB_APP_INSTALLATION_ID);
      }
      
      return token;
    },
    async session({ session, token }) {
      const user = (session as Session).user;
      user.accessToken = token.accessToken as string;
      user.installationToken = token.installationToken as string;
      return session;
    },
  },
})
