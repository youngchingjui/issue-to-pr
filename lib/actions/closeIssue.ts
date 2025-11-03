"use server"

import { Octokit } from "@octokit/rest"
import { revalidateTag } from "next/cache"
import { err, ok, type Result } from "shared/entities/result"
import type { GithubIssueErrors as CloseIssueErrors } from "shared/ports/github/issue.writer"
import { z } from "zod"

import { auth } from "@/auth"

const closeIssueInputSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  number: z.number().int().positive(),
})

export type CloseIssueInput = z.infer<typeof closeIssueInputSchema>

export type CloseIssueOk = { number: number; url: string }
export type { CloseIssueErrors }

export async function closeIssueAction(
  input: unknown
): Promise<Result<CloseIssueOk, CloseIssueErrors>> {
  const parsed = closeIssueInputSchema.safeParse(input)
  if (!parsed.success) {
    const flattened = parsed.error.flatten()
    return err("ValidationFailed", {
      message: "Invalid input. Please check the highlighted fields.",
      fieldErrors: flattened.fieldErrors,
    })
  }

  const session = await auth()
  const token = session?.token?.access_token
  if (!token || typeof token !== "string") {
    return err("AuthRequired", {
      message: "Please reconnect your GitHub account.",
    })
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
    } catch {}

    return ok({
      number: res.data.number ?? number,
      url: res.data.html_url ?? "",
    })
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null) {
      let status: number | undefined
      let message: string | undefined
      const errRecord = e as Record<string, unknown>
      const statusVal = errRecord.status
      if (typeof statusVal === "number") {
        status = statusVal
      }
      const messageVal = errRecord.message
      if (typeof messageVal === "string") {
        message = messageVal
      }

      if (status === 404) return err("RepoNotFound", { status, message })
      if (status === 401 || status === 403)
        return err("AuthRequired", { status, message })
      if (status === 410) return err("IssuesDisabled", { status, message })
      if (status === 422) return err("ValidationFailed", { status, message })
      if (status === 429) return err("RateLimited", { status, message })
      return err("Unknown", { status, message })
    }
    return err("Unknown", { message: "Unknown error" })
  }
}
