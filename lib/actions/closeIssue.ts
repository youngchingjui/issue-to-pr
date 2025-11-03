"use server"

import { revalidateTag } from "next/cache"
import { Octokit } from "@octokit/rest"
import { z } from "zod"

import { auth } from "@/auth"

const closeIssueInputSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  number: z.number().int().positive(),
})

export type CloseIssueInput = z.infer<typeof closeIssueInputSchema>

export type CloseIssueResult =
  | { status: "success"; number: number; url: string }
  | {
      status: "error"
      code:
        | "AuthRequired"
        | "RepoNotFound"
        | "IssuesDisabled"
        | "RateLimited"
        | "ValidationFailed"
        | "Unknown"
      message: string
      fieldErrors?: Record<string, string[]>
    }

export async function closeIssueAction(input: unknown): Promise<CloseIssueResult> {
  const parsed = closeIssueInputSchema.safeParse(input)
  if (!parsed.success) {
    const flattened = parsed.error.flatten()
    return {
      status: "error",
      code: "ValidationFailed",
      message: "Invalid input. Please check the highlighted fields.",
      fieldErrors: flattened.fieldErrors as Record<string, string[]>,
    }
  }

  const session = await auth()
  const token = session?.token?.access_token
  if (!token || typeof token !== "string") {
    return {
      status: "error",
      code: "AuthRequired",
      message: "Please reconnect your GitHub account.",
    }
  }

  const { owner, repo, number } = parsed.data

  try {
    const octokit = new Octokit({ auth: token })
    const res = await octokit.issues.update({
      owner,
      repo,
      issue_number: number,
      state: "closed",
    })

    // Revalidate caches tagged for this repo's issues
    const repoFullName = `${owner}/${repo}`
    try {
      revalidateTag("issues-list")
      revalidateTag(repoFullName)
      revalidateTag(`issues-list:${repoFullName}`)
    } catch (e) {
      console.warn("Failed to revalidate tags after closing issue", e)
    }

    return {
      status: "success",
      number: res.data.number ?? number,
      url: res.data.html_url ?? "",
    }
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string }
    if (err?.status === 404) {
      return { status: "error", code: "RepoNotFound", message: err.message || "Not found" }
    }
    if (err?.status === 401 || err?.status === 403) {
      return { status: "error", code: "AuthRequired", message: err.message || "Unauthorized" }
    }
    if (err?.status === 410) {
      return { status: "error", code: "IssuesDisabled", message: err.message || "Issues disabled" }
    }
    if (err?.status === 429) {
      return { status: "error", code: "RateLimited", message: err.message || "Rate limited" }
    }
    return { status: "error", code: "Unknown", message: err?.message || "Unknown error" }
  }
}

