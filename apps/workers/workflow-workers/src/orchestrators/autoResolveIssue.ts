import { createAppAuth } from "@octokit/auth-app"
import { Octokit } from "@octokit/rest"

import { EventBusAdapter } from "@/shared/adapters/ioredis/EventBusAdapter"
import { StorageAdapter } from "@/shared/adapters/neo4j/StorageAdapter"
import { setAccessToken } from "@/shared/auth"
import { getPrivateKeyFromFile } from "@/shared/services/fs"
import {
  checkProviderSupported,
  resolveApiKey,
} from "@/shared/services/resolveApiKey"
import { autoResolveIssue as autoResolveIssueWorkflow } from "@/shared/usecases/workflows/autoResolveIssue"

import { getEnvVar, publishJobStatus } from "../helper"
import { neo4jDs } from "../neo4j"

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
  const { GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY_PATH, REDIS_URL } = getEnvVar()

  // Single storage adapter for all Neo4j access (settings + workflow runs)
  const storage = new StorageAdapter(neo4jDs)
  const settings = storage.settings.user

  // Resolve which LLM provider to use.
  // Priority: explicit user preference → single available key → fail.
  // See docs/user/multi-model-support.md "Defaults and fallbacks".
  const resolved = await resolveApiKey(settings, githubLogin)
  if (!resolved.ok) {
    throw new Error(resolved.error)
  }

  const { provider, apiKey } = resolved

  const unsupported = checkProviderSupported(provider)
  if (unsupported) {
    throw new Error(unsupported)
  }

  // TODO: Maybe we should move all data-loading functions (something akin to all `async` functions), anything that accesses
  // information from another source (database, file system, cache, etc.) into the workflow itself.
  const privateKey = await getPrivateKeyFromFile(GITHUB_APP_PRIVATE_KEY_PATH)

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

  // TODO: We gotta get rid of this.
  setAccessToken(auth.token)

  await publishJobStatus(jobId, "Fetching issue and running LLM")

  const result = await autoResolveIssueWorkflow(
    {
      issueNumber,
      repoFullName,
      login: githubLogin,
      apiKey,
      branch,
    },
    {
      eventBus: eventBusAdapter,
      storage,
    }
  )

  // Handler will publish the completion status
  return result.messages
}
