import { createAppAuth } from "@octokit/auth-app"
import { Octokit } from "@octokit/rest"

import { StorageAdapter } from "@/shared/adapters/neo4j/StorageAdapter"
import { runWithInstallationId } from "@/shared/lib/utils/utils-server"
import { getPrivateKeyFromFile } from "@/shared/services/fs"
import { makeInstallationAuthProvider } from "@/shared/services/github/authProvider"
import { createDependentPRWorkflow } from "@/shared/usecases/workflows/createDependentPR"

import { getEnvVar, publishJobStatus } from "../helper"
import { neo4jDs } from "../neo4j"

export type CreateDependentPRJobData = {
  workflowId: string
  repoFullName: string
  pullNumber: number
  githubLogin: string
  githubInstallationId: string
}

/**
 * Orchestrator entrypoint for the createDependentPR job.
 * @deprecated Prefer invoking the shared use-case `createDependentPRWorkflow` directly with
 * dependency-injected providers (auth, storage). This thin wrapper exists to preserve
 * current worker routing and will be removed after consumers migrate.
 */
export async function createDependentPR(
  jobId: string,
  {
    workflowId,
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
  const {
    GITHUB_APP_ID,
    GITHUB_APP_PRIVATE_KEY_PATH,
    WEB_APP_URL,
    ENVIRONMENT_NAME,
  } = getEnvVar()

  // Create storage adapter
  const storage = new StorageAdapter(neo4jDs)

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
          storage,
          userId: githubLogin,
          jobId: workflowId,
          initiator: { type: "api", actorLogin: githubLogin, label: "webhook" },
          authProvider,
          webAppUrl: WEB_APP_URL || null,
          environmentName: ENVIRONMENT_NAME || null,
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
