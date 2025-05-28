import { v4 as uuidv4 } from "uuid"

import { getRepoFromString } from "@/lib/github/content"
import { updateJobStatus } from "@/lib/redis-old"
import commentOnIssue from "@/lib/workflows/commentOnIssue"
import { n4j } from "@/lib/neo4j/client"
import * as IssueRepo from "@/lib/neo4j/repositories/issue"
import * as PlanRepo from "@/lib/neo4j/repositories/plan"

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

  // 1. Handle "issues" events - now including "edited"
  if (event === GitHubEvent.Issues) {
    const action = payload["action"];
    const repoFullName = payload["repository"]?.["full_name"];
    const issueNumber = payload["issue"]?.["number"];

    if (!repoFullName || !issueNumber) {
      console.warn('[webhook] Missing repo or issue info in issues event');
      return;
    }

    if (action === "opened") {
      // Generate a unique job ID
      const jobId = uuidv4()
      await updateJobStatus(
        jobId,
        "Received webhook event for new issue. Starting commentOnIssue workflow."
      )

      const repo = await getRepoFromString(repoFullName)
      commentOnIssue(
        issueNumber,
        repo,
        process.env.OPENAI_API_KEY!, // TODO: Pull API key from user account
        jobId,
        POST_TO_GITHUB_SETTING
      )
    }
    if (action === "edited") {
      // Step 1: Update local Issue, Step 2: Mark plans outdated.
      const neo4jSession = await n4j.getSession();
      try {
        await neo4jSession.writeTransaction(async (tx) => {
          // update Issue fields (title/body)
          if ('title' in payload["issue"] || 'body' in payload["issue"]) {
            await IssueRepo.update(tx, {
              number: issueNumber,
              repoFullName,
              ...(payload["issue"]["title"] && { title: payload["issue"]["title"] }),
              ...(payload["issue"]["body"] && { body: payload["issue"]["body"] }),
            });
          }
          // mark all plans for this issue as outdated
          await PlanRepo.markPlansOutdated(tx, { repoFullName, issueNumber });
        });
        console.log(`[webhook] Updated issue ${repoFullName}#${issueNumber} and marked plans outdated.`);
      } finally {
        await neo4jSession.close();
      }
    }
    return;
  }

  // 2. Handle "issue_comment" events (created/edited)
  if (event === GitHubEvent.IssueComment) {
    const action = payload["action"];
    const repoFullName = payload["repository"]?.["full_name"];
    const issueNumber = payload["issue"]?.["number"];
    if (!repoFullName || !issueNumber) {
      console.warn('[webhook] Missing repo or issue info in issue_comment event');
      return;
    }
    if (action === "created" || action === "edited") {
      // For now: mark all plans for this issue as outdated.
      const neo4jSession = await n4j.getSession();
      try {
        await neo4jSession.writeTransaction(async (tx) => {
          await PlanRepo.markPlansOutdated(tx, { repoFullName, issueNumber });
        });
        console.log(`[webhook] Marked plans as outdated for ${repoFullName}#${issueNumber} due to comment ${action}`);
      } finally {
        await neo4jSession.close();
      }
    }
    return;
  }

  // 3. Handle pull request review (submitted) and review comments (created/edited)
  if (
    (event === GitHubEvent.PullRequestReview &&
      (payload["action"] === "submitted")) ||
    (event === GitHubEvent.PullRequestReviewComment &&
      (payload["action"] === "created" || payload["action"] === "edited"))
  ) {
    // Find associated repo/issue from PR/Review payload
    const repoFullName = payload["repository"]?.["full_name"];
    const issueNumber = payload["pull_request"]?.["number"] || payload["issue"]?.["number"];
    if (!repoFullName || !issueNumber) {
      console.warn('[webhook] Missing repo or PR/issue info in PR review event');
      return;
    }
    // Mark plans as outdated (or trigger a context update, depending on review details)
    const neo4jSession = await n4j.getSession();
    try {
      await neo4jSession.writeTransaction(async (tx) => {
        await PlanRepo.markPlansOutdated(tx, { repoFullName, issueNumber });
      });
      console.log(`[webhook] Marked plans as outdated for ${repoFullName}#${issueNumber} due to PR review or comment.`);
    } finally {
      await neo4jSession.close();
    }
    return;
  }

  // Default: Log event
  const repository =
    payload["repository"]?.["full_name"] || "<unknown repository>"
  console.log(`${event} event received on ${repository}`)
}
