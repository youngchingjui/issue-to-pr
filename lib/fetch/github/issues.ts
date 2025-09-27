"use server"

import { makeIssueReaderAdapter } from "shared/adapters/github/IssueReaderAdapter"
import {
  makeAccessTokenProviderFrom,
  makeSessionProvider,
} from "shared/providers/auth"
import { makeGetIssueUseCase } from "shared/usecases/getIssue"

import { auth } from "@/auth"
import type { GetIssueResult } from "@/lib/types/github"

export const getIssue = async (
  repoFullName: string,
  issueNumber: number
): Promise<GetIssueResult> => {
  try {
    // TODO: Not quite sure why we need a separate SessionProvider AND AccessTokenProvider
    // Boundary: obtain session from NextAuth on the server
    const sessionProvider = makeSessionProvider(() => auth())
    const accessTokenProvider = makeAccessTokenProviderFrom(
      sessionProvider,
      (s) => s?.token?.access_token as unknown as string | null | undefined
    )

    // Ensure auth present; if not, treat as forbidden
    let token: string
    try {
      token = await accessTokenProvider()
    } catch {
      return { type: "forbidden" }
    }

    // Adapter: IssueReader using GitHub OAuth user token via provider
    const issueReader = makeIssueReaderAdapter(async () => ({
      type: "oauth_user" as const,
      token,
    }))

    // Use case
    const runGetIssue = makeGetIssueUseCase({ issueReader })
    const res = await runGetIssue({ repoFullName, number: issueNumber })

    if (!res.ok) {
      switch (res.error) {
        case "NotFound":
        case "RepoNotFound":
          return { type: "not_found" }
        case "Forbidden":
        case "AuthRequired":
          return { type: "forbidden" }
        default:
          return { type: "other_error", error: res }
      }
    }

    // Map IssueDetails -> GitHubIssue-like expected by UI
    const d = res.value
    const issue = {
      number: d.number,
      title: d.title ?? "",
      body: d.body ?? "",
      state: d.state === "OPEN" ? "open" : "closed",
      html_url: d.url,
      created_at: d.createdAt,
      updated_at: d.updatedAt,
      closed_at: d.closedAt ?? undefined,
      user: d.authorLogin ? { login: d.authorLogin } : undefined,
      repository: { full_name: d.repoFullName },
    } as import("@/lib/types/github").GitHubIssue

    return { type: "success", issue }
  } catch (error) {
    return { type: "other_error", error }
  }
}
