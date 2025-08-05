// src/infrastructure/auth/session-auth-provider.ts
import { auth } from "@/auth"

import type {
  AuthenticationProvider,
  RepositoryAuth,
} from "../../types/repository-setup"

export const createSessionAuthProvider = (): AuthenticationProvider => ({
  getAuthentication: async (): Promise<RepositoryAuth> => {
    const session = await auth()

    if (!session?.token?.access_token) {
      throw new Error("No session token available")
    }

    if (typeof session.token.access_token !== "string") {
      throw new Error("Access token is not a string")
    }

    return {
      token: session.token.access_token,
      type: "user",
    }
  },
})
