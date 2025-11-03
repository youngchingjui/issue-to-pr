"use server"

import { revalidateTag } from "next/cache"
import { makeIssueWriterAdapter } from "shared/adapters/github/octokit/rest/issue.writer"
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

export async function closeIssueAction(input: unknown): Promise<void> {
  const parsed = closeIssueInputSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error("Invalid input. Please check the highlighted fields.")
  }

  const session = await auth()
  const token = session?.token?.access_token
  if (!token || typeof token !== "string") {
    throw new Error("Please reconnect your GitHub account.")
  }

  const { owner, repo, number } = parsed.data

  try {
    const adapter = makeIssueWriterAdapter({ token })
    const result = await adapter.closeIssue({ owner, repo, number })
    if (!result.ok) throw new Error(String(result.error))

    // Revalidate caches tagged for this repo's issues
    const repoFullName = `${owner}/${repo}`
    try {
      revalidateTag("issues-list")
      revalidateTag(repoFullName)
      revalidateTag(`issues-list:${repoFullName}`)
    } catch {}

    console.log("Issue closed successfully")
  } catch (e: unknown) {
    console.error(e instanceof Error ? e.message : "Unknown error")
  }
}
