"use server"

import { revalidateTag } from "next/cache"
import { makeIssueWriterAdapter } from "shared/adapters/github/octokit/rest/issue.writer"
import { createIssueForRepo } from "shared/services/github/issues"

import { auth } from "@/auth"

import { CreateIssueActionParams, createIssueActionSchema } from "./schemas"

export function createIssueAction(input: CreateIssueActionParams): Promise<void>
export async function createIssueAction(input: unknown): Promise<void> {
  const parsed = createIssueActionSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error("Invalid input. Please check the highlighted fields.")
  }

  // Composition: wire concrete adapter using the current user's token
  const session = await auth()
  const token = session?.token?.access_token
  if (!token || typeof token !== "string") {
    throw new Error("Please reconnect your GitHub account.")
  }

  const githubAdapter = makeIssueWriterAdapter({ token })
  const res = await createIssueForRepo(githubAdapter, parsed.data)

  if (res.ok) {
    // Revalidate the issues list cache for this repo so the new issue appears immediately
    const repoFullName = `${parsed.data.owner}/${parsed.data.repo}`
    try {
      revalidateTag("issues-list")
      revalidateTag(repoFullName)
      revalidateTag(`issues-list:${repoFullName}`)
    } catch (e) {
      console.warn("Failed to revalidate tags after creating issue", e)
    }

    console.log("Issue created successfully")
  } else {
    throw new Error(String(res.error))
  }
}
