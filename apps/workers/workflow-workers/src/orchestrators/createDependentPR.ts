import { createAppAuth } from "@octokit/auth-app"
import { Octokit } from "@octokit/rest"
import type { Transaction } from "neo4j-driver"
import { EventBusAdapter } from "shared/adapters/ioredis/EventBusAdapter"
import { createNeo4jDataSource } from "shared/adapters/neo4j/dataSource"
import { makeSettingsReaderAdapter } from "shared/adapters/neo4j/repositories/SettingsReaderAdapter"
import { setAccessToken } from "shared/auth"
import { getPrivateKeyFromFile } from "shared/services/fs"
import { createDependentPRWorkflow } from "shared/usecases/workflows/createDependentPR"

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

export type CreateDependentPRJobData = {
  repoFullName: string
  pullNumber: number
  githubLogin: string
  githubInstallationId: string
}

export async function createDependentPR(
  jobId: string,
  { repoFullName, pullNumber, githubLogin, githubInstallationId }: CreateDependentPRJobData
) {
  await publishJobStatus(
    jobId,
    `Preparing to create dependent PR for ${repoFullName}#${pullNumber}`
  )

  const {
    NEO4J_URI,
    NEO4J_USER,
    NEO4J_PASSWORD,
    GITHUB_APP_ID,
    GITHUB_APP_PRIVATE_KEY_PATH,
    REDIS_URL,
  } = getEnvVar()

  const neo4jDs = createNeo4jDataSource({
    uri: NEO4J_URI,
    user: NEO4J_USER,
    password: NEO4J_PASSWORD,
  })

  const settingsAdapter = makeSettingsReaderAdapter({
    getSession: () => neo4jDs.getSession(),
    userRepo,
  })

  const privateKey = await getPrivateKeyFromFile(GITHUB_APP_PRIVATE_KEY_PATH)
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
  if (!auth || typeof auth !== "object" || !("token" in auth) || typeof auth.token !== "string") {
    throw new Error("Failed to get installation token")
  }
  setAccessToken(auth.token)

  await publishJobStatus(jobId, "Running dependent PR workflow")

  const result = await createDependentPRWorkflow(
    {
      repoFullName,
      pullNumber,
      login: githubLogin,
      jobId,
    },
    {
      settings: settingsAdapter,
      eventBus: eventBusAdapter,
    }
  )

  await publishJobStatus(jobId, `Completed: created dependent branch ${result.branch}`)
  return result.branch
}

