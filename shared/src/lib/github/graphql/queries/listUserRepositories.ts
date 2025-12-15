"use server"

/**
 * This function is not available in the shared package because it requires
 * a user session token (NextAuth). Use the app-layer implementation instead:
 * `lib/github/graphql/queries/listUserRepositories.ts`.
 */
export async function listUserRepositories(): Promise<never> {
  throw new Error(
    "shared: listUserRepositories is not available. Use the app-layer version that has access to user session."
  )
}

