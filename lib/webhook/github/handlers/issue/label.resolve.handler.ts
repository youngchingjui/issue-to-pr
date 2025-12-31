import { makeSettingsReaderAdapter } from "shared/adapters/neo4j/repositories/SettingsReaderAdapter"
import { v4 as uuidv4 } from "uuid"

import { getRepoFromString } from "@/lib/github/content"
import { getIssue } from "@/lib/github/issues"
import { neo4jDs } from "@/lib/neo4j"
import * as userRepo from "@/lib/neo4j/repositories/user"
import { updateJobStatus } from "@/lib/redis-old"
import { runWithInstallationId } from "@/lib/utils/utils-server"
import type { IssuesPayload } from "@/lib/webhook/github/types"
import { resolveIssue } from "@/lib/workflows/resolveIssue"

const POST_TO_GITHUB_SETTING = true // TODO: Set setting in database
const CREATE_PR_SETTING = true // TODO: Set setting in database

/**
 * Handler: Issue labeled with "resolve"
 * - Validates environment and user API key
 * - Uses installation id context to authenticate Octokit requests
 * - Launches resolveIssue workflow (fire-and-forget)
 */
export async function handleIssueLabelResolve({
  payload,
  installationId,
}: {
  payload: IssuesPayload
  installationId: string
}) {
  const repoFullName = payload.repository.full_name
  const issueNumber = payload.issue.number
  const labelerLogin = payload.sender.login
  const labelerId = payload.sender.id

  const settingsReader = makeSettingsReaderAdapter({
    getSession: () => neo4jDs.getSession("READ"),
    userRepo: userRepo,
  })

  const apiKeyResult = await settingsReader.getOpenAIKey(labelerLogin)
  if (!apiKeyResult.ok || !apiKeyResult.value) {
    console.error(
      `Missing OpenAI API key for user ${labelerLogin}. Skipping resolveIssue.`
    )
    return
  }
  const apiKey = apiKeyResult.value
  const postToGithub = POST_TO_GITHUB_SETTING
  const createPR = CREATE_PR_SETTING

  // Run workflow with installation context so downstream GitHub calls succeed
  runWithInstallationId(String(installationId), async () => {
    try {
      const jobId = uuidv4()
      await updateJobStatus(
        jobId,
        'Received "resolve" label on issue. Starting resolveIssue workflow.'
      )

      const fullRepo = await getRepoFromString(repoFullName)
      const issue = await getIssue({ fullName: repoFullName, issueNumber })
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
        webhookContext: {
          event: "issues",
          action: "labeled",
          sender: {
            id: String(labelerId),
            login: labelerLogin,
          },
          installationId: String(installationId),
        },
      })
    } catch (e) {
      console.error("Failed to run resolveIssue workflow from label:", e)
    }
  })
}
