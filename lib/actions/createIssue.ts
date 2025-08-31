"use server"

import { makeGithubGraphQLAdapter } from "@shared/adapters/github-graphql"
import { createIssueForRepo } from "@shared/services/github/issues"

import { auth } from "@/auth"

import {
  CreateIssueActionParams,
  type CreateIssueActionResult,
  createIssueActionSchema,
} from "./schemas"

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
