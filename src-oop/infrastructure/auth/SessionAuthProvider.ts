// src-oop/infrastructure/auth/SessionAuthProvider.ts
import { auth } from "@/auth"
import {
  ISessionAuthProvider,
  RepositoryAuth,
} from "../../types/repository-setup"

export class SessionAuthProvider implements ISessionAuthProvider {
  async getAuthentication(): Promise<RepositoryAuth> {
    const session = await auth()

    if (!session?.token?.access_token) {
      throw new Error("No session token available")
    }

    if (typeof session.token.access_token !== "string") {
      throw new Error("Access token is not a string")
    }

    return new RepositoryAuth(session.token.access_token, "user")
  }
}
