import type { Transaction } from "neo4j-driver"
import { makeIssueReaderAdapter } from "shared/adapters/github/IssueReaderAdapter"
import { OpenAIAdapter } from "shared/adapters/llm/OpenAIAdapter"
import { createNeo4jDataSource } from "shared/adapters/neo4j/dataSource"
import { makeSettingsReaderAdapter } from "shared/adapters/neo4j/repositories/SettingsReaderAdapter"
import type { GitHubAuthMethod } from "shared/ports/github/issue.reader"
import { getPrivateKeyFromFile } from "shared/services/fs"
import { autoResolveIssue } from "shared/usecases/workflows/autoResolveIssue"

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

// TODO: Explore should the `githubInstallationId` be passed here as a parameter?
// Or should it be retrieved from within the workflow run?
export type AutoResolveJobData = {
  repoFullName: string
  issueNumber: number
  branch?: string
  githubLogin: string
  githubInstallationId: string
}

export async function autoResolveIssue(
  jobId: string,
  data: AutoResolveJobData
) {
  const { repoFullName, issueNumber, githubLogin, githubInstallationId } = data

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
  const ghAuth: GitHubAuthMethod = {
    type: "app_installation",
    appId: GITHUB_APP_ID,
    privateKey,
    installationId: githubInstallationId,
  }
  const issueReader = makeIssueReaderAdapter(ghAuth)

  await publishJobStatus(jobId, "Fetching issue and running LLM")

  const result = await autoResolveIssue(
    {
      settings: settingsAdapter,
      llm: (apiKey: string) => new OpenAIAdapter(apiKey),
      issueReader,
    },
    {
      repoFullName,
      login: githubLogin,
      issueNumber,
      workflowId: jobId,
      model: "gpt-4o",
    }
  )

  if (!result.ok) {
    throw new Error(`ResolveIssue failed: ${result.error}`)
  }

  // Handler will publish the completion status
  return result.value.response
}
