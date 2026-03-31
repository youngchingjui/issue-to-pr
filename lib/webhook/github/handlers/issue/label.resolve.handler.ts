import { v4 as uuidv4 } from "uuid"

import { getRepoFromString } from "@/lib/github/content"
import { getIssue } from "@/lib/github/issues"
import { neo4jDs } from "@/lib/neo4j"
import { updateJobStatus } from "@/lib/redis-old"
import { runWithInstallationId } from "@/lib/utils/utils-server"
import { postApiKeyErrorComment } from "@/lib/webhook/github/postApiKeyErrorComment"
import type { IssuesPayload } from "@/lib/webhook/github/types"
import { resolveIssue } from "@/lib/workflows/resolveIssue"
import { StorageAdapter } from "@/shared/adapters/neo4j/StorageAdapter"
import {
  checkProviderSupported,
  resolveApiKey,
} from "@/shared/services/resolveApiKey"

const POST_TO_GITHUB_SETTING = true // TODO: Set setting in database
const CREATE_PR_SETTING = true // TODO: Set setting in database

/**
 * Handler: Issue labeled with "resolve"
 * - Validates environment and user API key (provider-aware)
 * - Posts GitHub comment on validation failure
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
  const repoFullName = payload.repository?.full_name
  const issueNumber = payload.issue?.number
  const labelerLogin = payload.sender?.login

  if (!repoFullName || typeof issueNumber !== "number") {
    console.error(
      "Missing repository.full_name or issue.number in Issues payload"
    )
    return
  }

  if (!labelerLogin) {
    console.error("Missing sender.login for labeled issue event")
    return
  }

  const storage = new StorageAdapter(neo4jDs)
  const resolved = await resolveApiKey(storage.settings.user, labelerLogin)
  const unsupported = resolved.ok
    ? checkProviderSupported(resolved.provider)
    : null
  if (!resolved.ok || unsupported) {
    const errorMessage = resolved.ok ? unsupported! : resolved.error
    await postApiKeyErrorComment({
      installationId: Number(installationId),
      repoFullName,
      issueNumber,
      errorMessage,
    })
    return
  }
  const apiKey = resolved.apiKey
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
      })
    } catch (e) {
      console.error("Failed to run resolveIssue workflow from label:", e)
    }
  })
}
