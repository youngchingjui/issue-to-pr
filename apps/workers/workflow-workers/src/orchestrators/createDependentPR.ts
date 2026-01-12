import { createAppAuth } from "@octokit/auth-app"
import { Octokit } from "@octokit/rest"
import type { Transaction } from "neo4j-driver"

import { makeSettingsReaderAdapter } from "@/shared/adapters/neo4j/repositories/SettingsReaderAdapter"
import { runWithInstallationId } from "@/shared/lib/utils/utils-server"
import { getPrivateKeyFromFile } from "@/shared/services/fs"
import { makeInstallationAuthProvider } from "@/shared/services/github/authProvider"
import { createDependentPRWorkflow } from "@/shared/usecases/workflows/createDependentPR"

import { getEnvVar, publishJobStatus } from "../helper"
import { neo4jDs } from "../neo4j"

// Minimal user repository implementation for SettingsReaderAdapter
// TODO: This should not be here. Find another place to implement this.
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
  {
    repoFullName,
    pullNumber,
    githubLogin,
    githubInstallationId,
  }: CreateDependentPRJobData
) {
  await publishJobStatus(
    jobId,
    `Preparing to update dependent PR for ${repoFullName}#${pullNumber}`
  )

  // Load environment
  const { GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY_PATH } = getEnvVar()

  // Settings adapter (loads OpenAI API key from Neo4j)
  const settingsAdapter = makeSettingsReaderAdapter({
    getSession: () => neo4jDs.getSession("READ"),
    userRepo,
  })

  const privateKey = await getPrivateKeyFromFile(GITHUB_APP_PRIVATE_KEY_PATH)

  // Get an installation access token (also validates installation exists)
  const octokit = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: GITHUB_APP_ID,
      privateKey,
      installationId: githubInstallationId,
    },
  })
  const auth = await octokit.auth({ type: "installation" })
  if (
    !auth ||
    typeof auth !== "object" ||
    !("token" in auth) ||
    typeof auth.token !== "string"
  ) {
    throw new Error("Failed to get installation token")
  }

  // Resolve API key for the commenter
  const apiKeyResult = await settingsAdapter.getOpenAIKey(githubLogin)
  if (!apiKeyResult.ok || !apiKeyResult.value) {
    await publishJobStatus(
      jobId,
      "User missing API key; cannot run createDependentPR workflow"
    )
    throw new Error("Missing API key for user")
  }

  const authProvider = makeInstallationAuthProvider({
    installationId: Number(githubInstallationId),
    appId: GITHUB_APP_ID,
    privateKey,
  })

  await publishJobStatus(jobId, "Starting createDependentPR workflow")

  let branch = ""
  await new Promise<void>((resolve, reject) => {
    runWithInstallationId(String(githubInstallationId), async () => {
      try {
        const result = await createDependentPRWorkflow({
          repoFullName,
          pullNumber,
          apiKey: apiKeyResult.value,
          jobId,
          initiator: { type: "api", actorLogin: githubLogin, label: "webhook" },
          authProvider,
        })
        branch = result.branch
        resolve()
      } catch (e) {
        reject(e)
      }
    })
  })

  await publishJobStatus(jobId, `Completed: Ensured branch ${branch} is pushed`)

  return `Branch pushed: ${branch}`
}
