import { createAppAuth } from "@octokit/auth-app"
import { Octokit } from "@octokit/rest"
import type { Transaction } from "neo4j-driver"
import { EventBusAdapter } from "shared/adapters/ioredis/EventBusAdapter"
import { createNeo4jDataSource } from "shared/adapters/neo4j/dataSource"
import { makeSettingsReaderAdapter } from "shared/adapters/neo4j/repositories/SettingsReaderAdapter"
import { setAccessToken } from "shared/auth"
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

  const result = await autoResolveIssueWorkflow(
    {
      issueNumber,
      repoFullName,
      login: githubLogin,
      branch,
    },
    {
      settings: settingsAdapter,
      eventBus: eventBusAdapter,
    }
  )

  // Handler will publish the completion status
  return result.messages
}
