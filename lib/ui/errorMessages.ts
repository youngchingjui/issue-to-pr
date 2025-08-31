import type { CreateIssueActionResult } from "../actions/createIssue"

const friendly: Record<
  Exclude<CreateIssueActionResult, { status: "success" }> extends infer E
    ? E extends { code: infer C }
      ? C
      : never
    : never,
  string
> = {
  AuthRequired: "Please reconnect your GitHub account.",
  RepoNotFound: "We couldn’t find that repository.",
  IssuesDisabled:
    "Issues are disabled on this repository. Enable them in Settings → General.",
  RateLimited: "GitHub rate limit exceeded. Try again in a bit.",
  ValidationFailed: "Your input wasn’t accepted by GitHub.",
  Unknown: "Something went wrong while creating the issue.",
}

export function mapGithubErrorToCopy(state: CreateIssueActionResult): string {
  if (state.status === "success") return ""
  const base = friendly[state.code] ?? "An unexpected error occurred."
  if (state.code === "ValidationFailed") {
    const details = state.issues?.[0]
    return details ? `${base} ${details}` : base
  }
  return base
}
