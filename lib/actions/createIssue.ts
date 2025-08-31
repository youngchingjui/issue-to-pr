"use server"

import { makeGithubGraphQLAdapter } from "@shared/adapters/github-graphql"
import { createIssueForRepo } from "@shared/services/github/issues"
import { z } from "zod"

import { auth } from "@/auth"

export const createIssueActionSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  title: z.string().min(1),
  body: z.string().optional(),
})
export type CreateIssueActionParams = z.infer<typeof createIssueActionSchema>

const success = z.object({
  status: z.literal("success"),
  issueUrl: z.string().min(1),
  number: z.number(),
})
const error = z.object({
  status: z.literal("error"),
  code: z.enum([
    "AuthRequired",
    "RepoNotFound",
    "IssuesDisabled",
    "RateLimited",
    "ValidationFailed",
    "Unknown",
  ]),
  message: z.string().min(1),
  issues: z.array(z.string()).optional(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
})
export const createIssueActionResultSchema = z.discriminatedUnion("status", [
  success,
  error,
])
export type CreateIssueActionResult = z.infer<
  typeof createIssueActionResultSchema
>

export function createIssueAction(
  input: CreateIssueActionParams
): Promise<CreateIssueActionResult>
export async function createIssueAction(
  input: unknown
): Promise<CreateIssueActionResult> {
  const parsed = createIssueActionSchema.safeParse(input)
  if (!parsed.success) {
    const flattened = parsed.error.flatten()
    return {
      status: "error",
      code: "ValidationFailed",
      message: "Invalid input. Please check the highlighted fields.",
      issues: parsed.error.issues?.map((i) => i.message) ?? [],
      fieldErrors: flattened.fieldErrors as Record<string, string[]>,
    }
  }

  // Composition: wire concrete adapter using the current user's token
  const session = await auth()
  const token = session?.token?.access_token
  if (!token || typeof token !== "string") {
    return {
      status: "error",
      code: "AuthRequired",
      message: "Please reconnect your GitHub account.",
    }
  }

  const githubAdapter = makeGithubGraphQLAdapter(token)
  const res = await createIssueForRepo(githubAdapter, parsed.data)

  if (res.ok) {
    return {
      status: "success",
      issueUrl: res.value.url,
      number: res.value.number,
    }
  }

  // Return only machine-readable code and optional details; UI will map to copy
  return { status: "error", code: res.error, message: res.error }
}
