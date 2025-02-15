import { v4 as uuidv4 } from "uuid"

import { getRepoFromString } from "@/lib/github/content"
import { updateJobStatus } from "@/lib/redis"
import commentOnIssue from "@/lib/workflows/commentOnIssue"

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
  payload: object
}) => {
  if (!Object.values(GitHubEvent).includes(event as GitHubEvent)) {
    console.error("Invalid event type:", event)
    return
  }

  if (event === GitHubEvent.Issues) {
    const action = payload["action"]
    if (action === "opened") {
      // Generate a unique job ID
      const jobId = uuidv4()
      await updateJobStatus(
        jobId,
        "Received webhook event for new issue. Starting commentOnIssue workflow."
      )

      const repo = await getRepoFromString(payload["repository"]["full_name"])
      commentOnIssue(
        payload["issue"]["number"],
        repo,
        process.env.OPENAI_API_KEY, // TODO: Pull API key from user account
        jobId
      )
    }
  } else {
    const repository =
      payload["repository"]?.["full_name"] || "<unknown repository>"
    console.log(`${event} event received on ${repository}`)
  }
}
