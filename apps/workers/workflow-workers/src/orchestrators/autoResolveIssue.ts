import { createAppAuth } from "@octokit/auth-app"
import { Octokit } from "@octokit/rest"

import { EventBusAdapter } from "@/shared/adapters/ioredis/EventBusAdapter"
import { StorageAdapter } from "@/shared/adapters/neo4j/StorageAdapter"
import { setAccessToken } from "@/shared/auth"
import type { LLMProvider } from "@/shared/lib/types"
import { getPrivateKeyFromFile } from "@/shared/services/fs"
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
  // Priority: explicit user preference → infer from available keys → fail.
  // See docs/user/multi-model-support.md "Defaults and fallbacks".
  const providerResult = await settings.getLLMProvider(githubLogin)
  const explicitProvider =
    providerResult.ok && providerResult.value ? providerResult.value : null

  let provider: LLMProvider
  if (explicitProvider) {
    provider = explicitProvider
  } else {
    // No explicit preference — infer from which keys exist
    const [openaiKey, anthropicKey] = await Promise.all([
      settings.getOpenAIKey(githubLogin),
      settings.getAnthropicKey(githubLogin),
    ])
    const hasOpenAI = openaiKey.ok && !!openaiKey.value
    const hasAnthropic = anthropicKey.ok && !!anthropicKey.value

    if (hasOpenAI) {
      provider = "openai"
    } else if (hasAnthropic) {
      provider = "anthropic"
    } else {
      throw new Error(
        "No API key configured. Please add an API key for at least one provider in Settings."
      )
    }
  }

  if (provider === "anthropic") {
    throw new Error(
      "Anthropic Claude support is coming soon. Please switch your provider to OpenAI in Settings to run workflows."
    )
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
      branch,
    },
    {
      settings,
      eventBus: eventBusAdapter,
      storage,
    }
  )

  // Handler will publish the completion status
  return result.messages
}
