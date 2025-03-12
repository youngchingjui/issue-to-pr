"use server"

import { redirect } from "next/navigation"

import { GitHubAuthResult } from "@/lib/github/users"

type AuthErrorHandlerOptions = {
  redirectTo?: string
  redirectOnCodes?: string[]
}

/**
 * Helper function to handle authentication errors on the server
 * Can be used with getGithubUserWithError to redirect on auth failures
 */
export async function handleAuthError(
  result: GitHubAuthResult,
  options: AuthErrorHandlerOptions = {}
): Promise<GitHubAuthResult> {
  const { redirectTo = "/", redirectOnCodes = ["AUTH_FAILED", "NO_AUTH"] } =
    options

  if (result.error && redirectOnCodes.includes(result.error.code)) {
    redirect(redirectTo)
  }

  return result
}

/**
 * Helper that requires authentication and redirects if not authenticated
 * Returns the user or redirects to the specified path
 */
export async function requireAuth(
  result: GitHubAuthResult,
  redirectTo: string = "/"
) {
  if (!result.user) {
    redirect(redirectTo)
  }

  return result.user
}
