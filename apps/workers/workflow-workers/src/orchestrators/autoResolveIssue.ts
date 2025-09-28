import { OpenAIAdapter } from "shared/adapters/llm/OpenAIAdapter"
import { makeIssueReaderAdapter } from "shared/adapters/github/IssueReaderAdapter"
import { createNeo4jDataSource } from "shared/adapters/neo4j/dataSource"
import { makeSettingsReaderAdapter } from "shared/adapters/neo4j/repositories/SettingsReaderAdapter"
import type { AuthReaderPort } from "shared/ports/auth/reader"
import type { GitHubAuthMethod } from "shared/ports/github/issue.reader"
import { resolveIssue } from "shared/usecases/workflows/resolveIssue"

import { getEnvVar, publishJobStatus } from "../helper"

// Minimal user repository implementation for SettingsReaderAdapter
const userRepo = {
  async getUserSettings(tx: any, username: string) {
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
}

export async function autoResolveIssue(jobId: string, data: AutoResolveJobData) {
  const { repoFullName, issueNumber, githubLogin } = data

  await publishJobStatus(jobId, `Preparing to resolve ${repoFullName}#${issueNumber}`)

  // Load environment
  const {
    NEO4J_URI,
    NEO4J_USER,
    NEO4J_PASSWORD,
    GITHUB_APP_ID,
    GITHUB_APP_PRIVATE_KEY,
    GITHUB_APP_INSTALLATION_ID,
  } = getEnvVar() as unknown as {
    NEO4J_URI: string
    NEO4J_USER: string
    NEO4J_PASSWORD: string
    GITHUB_APP_ID: string
    GITHUB_APP_PRIVATE_KEY: string
    GITHUB_APP_INSTALLATION_ID: string
  }

  // Settings adapter (loads OpenAI API key from Neo4j)
  const neo4jDs = createNeo4jDataSource({
    uri: NEO4J_URI,
    user: NEO4J_USER,
    password: NEO4J_PASSWORD,
  })

  const settings = makeSettingsReaderAdapter({
    getSession: () => neo4jDs.getSession(),
    userRepo,
  })

  // Auth adapter (provides the triggering user's login for settings lookup)
  const auth: AuthReaderPort = {
    async getAuthenticatedUser() {
      return { id: githubLogin, githubLogin }
    },
    async getAccessToken() {
      // Not needed when using app installation auth for GitHub API calls
      return {
        access_token: "",
        refresh_token: "",
        expires_at: 0,
        expires_in: 0,
        scope: "",
        token_type: "",
        id_token: "",
      }
    },
    async getAuth() {
      return {
        ok: true as const,
        value: {
          user: { id: githubLogin, githubLogin },
          token: {
            access_token: "",
            refresh_token: "",
            expires_at: 0,
            expires_in: 0,
            scope: "",
            token_type: "",
            id_token: "",
          },
        },
      }
    },
  }

  // GitHub API via App Installation
  const ghAuth: GitHubAuthMethod = {
    type: "app_installation",
    appId: GITHUB_APP_ID,
    privateKey: GITHUB_APP_PRIVATE_KEY,
    installationId: GITHUB_APP_INSTALLATION_ID,
  }
  const issueReader = makeIssueReaderAdapter(ghAuth)

  await publishJobStatus(jobId, "Fetching issue and running LLM")

  const result = await resolveIssue(
    {
      auth,
      settings,
      llm: (apiKey: string) => new OpenAIAdapter(apiKey),
      issueReader,
    },
    { repoFullName, issueNumber, workflowId: jobId, model: "gpt-4o" }
  )

  if (!result.ok) {
    throw new Error(`ResolveIssue failed: ${result.error}`)
  }

  await publishJobStatus(jobId, "Completed: Generated resolution")
  return result.value.response
}

