import { createAppAuth } from "@octokit/auth-app"
import { Octokit } from "@octokit/rest"
import type { Transaction } from "neo4j-driver"
import { EventBusAdapter } from "shared/adapters/ioredis/EventBusAdapter"
import { createNeo4jDataSource } from "shared/adapters/neo4j/dataSource"
import { makeSettingsReaderAdapter } from "shared/adapters/neo4j/repositories/SettingsReaderAdapter"
import { setAccessToken } from "shared/auth"
import { createIssueComment, getIssueComments, updateIssueComment } from "shared/lib/github/issues"
import { getPrivateKeyFromFile } from "shared/services/fs"
import { autoResolveIssue as autoResolveIssueWorkflow } from "shared/usecases/workflows/autoResolveIssue"

import { getEnvVar, publishJobStatus } from "../helper"

// Minimal user repository implementation for SettingsReaderAdapter
const userRepo = {
  async getUserSettings(tx: Transaction, username: string) {
    const res = await tx.run(
      `
      MATCH (u:User {username: $username})-[:HAS_SETTINGS]->(s:Settings)
      RETURN s LIMIT 1
      `,
      { username }
    )
    const settings = res.records?.[0]?.get?.("s")?.properties ?? null
    if (!settings) return null
    return {
      openAIApiKey: settings.openAIApiKey ?? null,
    }
  },
}

export type AutoResolveJobData = {
  repoFullName: string
  issueNumber: number
  branch?: string
  githubLogin: string
  // `githubInstallationId` must be passed through the job data,
  // As it can only be obtained through 1) the Github webhook payload, or 2) through an authenticated
  // Github API request to `GET /users/{username}/installation`, `GET /repos/{owner}/{repo}/installation`
  // or `GET /app/installations`
  githubInstallationId: string
}

function getAppBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
}

function buildWorkflowRunLink(id: string): string {
  return `${getAppBaseUrl()}/workflow-runs/${id}`
}

async function findStatusCommentId(
  repoFullName: string,
  issueNumber: number,
  workflowId: string
): Promise<number | null> {
  try {
    const comments = await getIssueComments({ repoFullName, issueNumber })
    const marker = `<!-- workflow-run:${workflowId} -->`
    const match = comments.find((c) => typeof c.body === "string" && c.body.includes(marker))
    return match?.id ?? null
  } catch (e) {
    console.warn("Failed to list issue comments to find status marker:", e)
    return null
  }
}

function renderStatusComment(workflowId: string, status: "queued" | "running" | "completed" | "failed", extra?: string): string {
  const link = buildWorkflowRunLink(workflowId)
  const lines = [
    `[Issue to PR] Workflow status for this issue`,
    ``,
    `Status: ${status}`,
    `Details: ${link}`,
    ``,
    `<!-- workflow-run:${workflowId} -->`,
  ]
  if (extra && extra.trim().length > 0) {
    lines.splice(3, 0, `Note: ${extra}`)
  }
  return lines.join("\n")
}

async function upsertStatusComment(
  repoFullName: string,
  issueNumber: number,
  workflowId: string,
  status: "queued" | "running" | "completed" | "failed",
  extra?: string
) {
  const body = renderStatusComment(workflowId, status, extra)
  const commentId = await findStatusCommentId(repoFullName, issueNumber, workflowId)
  if (commentId) {
    await updateIssueComment({ commentId, repoFullName, comment: body })
  } else {
    await createIssueComment({ repoFullName, issueNumber, comment: body })
  }
}

export async function autoResolveIssue(
  jobId: string,
  {
    repoFullName,
    issueNumber,
    githubLogin,
    githubInstallationId,
    branch,
  }: AutoResolveJobData
) {
  await publishJobStatus(
    jobId,
    `Preparing to resolve ${repoFullName}#${issueNumber}`
  )

  // Load environment
  const {
    NEO4J_URI,
    NEO4J_USER,
    NEO4J_PASSWORD,
    GITHUB_APP_ID,
    GITHUB_APP_PRIVATE_KEY_PATH,
    REDIS_URL,
  } = getEnvVar()

  // Settings adapter (loads OpenAI API key from Neo4j)
  const neo4jDs = createNeo4jDataSource({
    uri: NEO4J_URI,
    user: NEO4J_USER,
    password: NEO4J_PASSWORD,
  })

  const settingsAdapter = makeSettingsReaderAdapter({
    getSession: () => neo4jDs.getSession(),
    userRepo,
  })

  // TODO: Maybe we should move all data-loading functions (something akin to all `async` functions), anything that accesses
  // information from another source (database, file system, cache, etc.) into the workflow itself.
  const privateKey = await getPrivateKeyFromFile(GITHUB_APP_PRIVATE_KEY_PATH)
  // GitHub API via App Installation

  // Temporary: set the access token for the workflow
  const octokit = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: GITHUB_APP_ID,
      privateKey,
      installationId: githubInstallationId,
    },
  })

  // Setup adapters for event bus
  const eventBusAdapter = new EventBusAdapter(REDIS_URL)
  const auth = await octokit.auth({ type: "installation" })
  if (
    !auth ||
    typeof auth !== "object" ||
    !("token" in auth) ||
    typeof auth.token !== "string"
  ) {
    throw new Error("Failed to get installation token")
  }
  setAccessToken(auth.token)

  await publishJobStatus(jobId, "Fetching issue and running LLM")

  // Update GitHub status comment to running (create if missing)
  try {
    await upsertStatusComment(repoFullName, issueNumber, jobId, "running")
  } catch (e) {
    console.warn("Failed to upsert running status comment:", e)
  }

  try {
    const result = await autoResolveIssueWorkflow(
      {
        issueNumber,
        repoFullName,
        login: githubLogin,
        branch,
        jobId, // ensure workflow run id matches job id so URLs align
      },
      {
        settings: settingsAdapter,
        eventBus: eventBusAdapter,
      }
    )

    // Update GitHub status comment to completed
    try {
      await upsertStatusComment(repoFullName, issueNumber, jobId, "completed")
    } catch (e) {
      console.warn("Failed to upsert completed status comment:", e)
    }

    // Handler will publish the completion status
    return result.messages
  } catch (error) {
    // Update GitHub status comment to failed
    try {
      const extra = error instanceof Error ? error.message : String(error)
      await upsertStatusComment(repoFullName, issueNumber, jobId, "failed", extra)
    } catch (e) {
      console.warn("Failed to upsert failed status comment:", e)
    }
    throw error
  }
}

