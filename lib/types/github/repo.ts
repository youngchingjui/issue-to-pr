import { z } from "zod"

/**
 * Zod schema for a GitHub repository full name, e.g. "username/reponame".
 * Only allows alphanumeric characters, dashes(-), underscores(_), and dots(.) for each part.
 */
export const repoFullNameSchema = z
  .string()
  .regex(
    /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/,
    'repoFullName must be in the form "username/repoName", using only alphanumerics, - _ and .'
  )

export type RepoFullName = z.infer<typeof repoFullNameSchema>
