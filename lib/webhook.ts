import { v4 as uuidv4 } from "uuid"

import { getRepoFromString } from "@/lib/github/content"
import { getIssue } from "@/lib/github/issues"
import { updateJobStatus } from "@/lib/redis-old"
import autoResolveIssue from "@/lib/workflows/autoResolveIssue"
import { resolveIssue } from "@/lib/workflows/resolveIssue"

const POST_TO_GITHUB_SETTING = true // TODO: Set setting in database
const CREATE_PR_SETTING = true // TODO: Set setting in database

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
  Ping = "ping",
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
    if (action === "labeled") {
      const labelName = payload["label"]?.["name"]

      // If the label added is "resolve", start the resolveIssue workflow
      if (labelName === "resolve") {
        const repoFullName = payload["repository"]?.["full_name"]
        if (typeof process.env.OPENAI_API_KEY !== "string") {
          throw new Error("OPENAI_API_KEY is not set")
        }

        const apiKey = process.env.OPENAI_API_KEY
        const issueNumber = payload["issue"]["number"]
        const postToGithub = POST_TO_GITHUB_SETTING
        const createPR = CREATE_PR_SETTING

        // Launch resolveIssue as a background job (fire-and-forget)
        ;(async () => {
          try {
            const jobId = uuidv4()

            await updateJobStatus(
              jobId,
              'Received "resolve" label on issue. Starting resolveIssue workflow.'
            )

            const fullRepo = await getRepoFromString(repoFullName)
            const issue = await getIssue({
              fullName: repoFullName,
              issueNumber,
            })

            if (issue.type !== "success") {
              console.error("Failed to get issue:", issue)
              return
            }

            await resolveIssue({
              issue: issue.issue,
              repository: fullRepo,
              apiKey,
              jobId,
              createPR: createPR && postToGithub,
            })
          } catch (e) {
            console.error("Failed to run resolveIssue workflow from label:", e)
          }
        })()
      }

      return
    }

    if (action === "opened") {
      if (typeof process.env.OPENAI_API_KEY !== "string") {
        throw new Error("OPENAI_API_KEY is not set")
      }

      // Generate a unique job ID
      const jobId = uuidv4()
      await updateJobStatus(
        jobId,
        'Received "opened" issue webhook. Starting autoResolveIssue workflow.'
      )

      const issueNumber = payload["issue"]["number"]
      const repoFullName = payload["repository"]["full_name"]
      const apiKey = process.env.OPENAI_API_KEY // TODO: Prefer GitHub App session token, if available

      // Fire-and-forget auto-resolve
      ;(async () => {
        try {
          const fullRepo = await getRepoFromString(repoFullName)
          const issueResult = await getIssue({
            fullName: repoFullName,
            issueNumber,
          })

          if (issueResult.type !== "success") {
            console.error("Failed to get issue:", issueResult)
            return
          }

          await autoResolveIssue({
            issue: issueResult.issue,
            repository: fullRepo,
            apiKey,
            jobId,
          })
        } catch (e) {
          console.error(
            "Failed to run autoResolveIssue workflow from webhook:",
            e
          )
        }
      })()
    }
  } else {
    const repository =
      payload["repository"]?.["full_name"] || "<unknown repository>"
    console.log(`${event} event received on ${repository}`)
  }
}

