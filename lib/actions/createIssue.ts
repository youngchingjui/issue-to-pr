"use server"

import { z } from "zod"
import { auth } from "@/auth"
import {
  createIssueForRepo,
  makeGithubRESTAdapter,
  type GithubIssueErrors,
} from "@/shared/src"

const schema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  title: z.string().min(1),
  body: z.string().optional(),
})

export type CreateIssueUIState =
  | { status: "success"; issueUrl: string; number: number }
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
    }

export async function createIssueAction(input: unknown): Promise<CreateIssueUIState> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return {
      status: "error",
      code: "ValidationFailed",
      message: "Check your inputs.",
    }
  }

  // Composition: wire concrete adapter using the current user's token
  const session = await auth()
  const token = session?.token?.access_token
  if (!token || typeof token !== "string") {
    return { status: "error", code: "AuthRequired", message: "Please reconnect your GitHub account." }
  }

  const port = makeGithubRESTAdapter(token)
  const res = await createIssueForRepo(port, parsed.data)

  if (res.ok) {
    return { status: "success", issueUrl: res.value.url, number: res.value.number }
  }

  const friendly: Record<GithubIssueErrors, string> = {
    AuthRequired: "Please reconnect your GitHub account.",
    RepoNotFound: "We couldn’t find that repository.",
    IssuesDisabled:
      "Issues are disabled on this repository. Enable them in Settings → General.",
    RateLimited: "GitHub rate limit exceeded. Try again in a bit.",
    ValidationFailed: "Your input wasn’t accepted by GitHub.",
    Unknown: "Something went wrong while creating the issue.",
  }

  return { status: "error", code: res.error, message: friendly[res.error] }
}

