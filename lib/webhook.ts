import { v4 as uuidv4 } from "uuid"

import { getRepoFromString } from "@/lib/github/content"
import { updateJobStatus } from "@/lib/redis-old"
// import commentOnIssue from "@/lib/workflows/commentOnIssue"

const POST_TO_GITHUB_SETTING = true // TODO: Set setting in database

// Subscribed events for Github App
enum GitHubEvent {
  Create = "create",
  Delete = "delete",
  Installation = "installation",
  InstallationRepositories = "installation_repositories",
  InstallationTarget = "installation_target",
  Issues = "issues",
  IssueComment = "issue_comment",
  PullRequest = "pull_request",
  PullRequestReview = "pull_request_review",
  PullRequestReviewComment = "pull_request_review_comment",
  PullRequestReviewThread = "pull_request_review_thread",
  Push = "push",
  Repository = "repository",
}

export const routeWebhookHandler = async ({
  event,
  payload,
}: {
  event: string
  payload: any
}) => {
  if (!Object.values(GitHubEvent).includes(event as GitHubEvent)) {
    console.error("Invalid event type:", event)
    return
  }

  if (event === GitHubEvent.Issues) {
    if (typeof process.env.OPENAI_API_KEY !== "string") {
      throw new Error("OPENAI_API_KEY is not set")
    }

    const action = payload["action"]
    if (action === "opened") {
      // Generate a unique job ID
      const jobId = uuidv4()
      await updateJobStatus(
        jobId,
        "Received webhook event for new issue. Starting commentOnIssue workflow."
      )

      const repo = await getRepoFromString(payload["repository"]["full_name"])

      // Instead of calling commentOnIssue directly, make a request to planandresolve API to run both workflows
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/api/workflow/planandresolve`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              issueNumber: payload["issue"]["number"],
              repoFullName: payload["repository"]["full_name"],
              apiKey: process.env.OPENAI_API_KEY, // TODO: Prefer GitHub App session token, if available
              postToGithub: POST_TO_GITHUB_SETTING,
              createPR: false,
            }),
          }
        )
        if (!res.ok) {
          const errorText = await res.text()
          throw new Error(`PlanAndResolve API call failed: ${errorText}`)
        }
      } catch (e) {
        console.error("Failed to trigger planandresolve API from webhook:", e)
      }
    }
  } else {
    const repository =
      payload["repository"]?.["full_name"] || "<unknown repository>"
    console.log(`${event} event received on ${repository}`)
  }
}
