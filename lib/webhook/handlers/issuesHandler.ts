import { makeSettingsReaderAdapter } from "shared/adapters/neo4j/repositories/SettingsReaderAdapter"
import { AuthReaderPort } from "shared/ports/auth/reader"
import { v4 as uuidv4 } from "uuid"

import { getRepoFromString } from "@/lib/github/content"
import { getInstallationTokenFromRepo } from "@/lib/github/installation"
import { getIssue } from "@/lib/github/issues"
import { neo4jDs } from "@/lib/neo4j"
import * as userRepo from "@/lib/neo4j/repositories/user"
import { updateJobStatus } from "@/lib/redis-old"
import { autoResolveIssue } from "@/lib/workflows/autoResolveIssue"
import { resolveIssue } from "@/lib/workflows/resolveIssue"

import { IssuesPayload, WebhookHandler } from "../types"

const POST_TO_GITHUB_SETTING = true // TODO: Set setting in database
const CREATE_PR_SETTING = true // TODO: Set setting in database

// Label constants
const RESOLVE_LABEL = "resolve"
const AUTO_RESOLVE_LABEL = "I2PR: Resolve Issue"

export class IssuesHandler implements WebhookHandler<IssuesPayload> {
  canHandle(event: string, _payload: IssuesPayload): boolean {
    return event === "issues"
  }

  async handle(_event: string, payload: IssuesPayload): Promise<void> {
    const action = payload.action
    if (action === "labeled") {
      await this.handleLabeled(payload)
    } else if (action === "opened") {
      // No-op: we intentionally do not launch any workflow on new issue creation.
      return
    } else {
      console.log(`[issues] Ignoring action: ${action}`)
      return
    }
  }

  private async handleLabeled(payload: IssuesPayload): Promise<void> {
    const labelName = payload.label?.name?.trim()

    // If the label added is "resolve", start the resolveIssue workflow
    if (labelName?.toLowerCase() === RESOLVE_LABEL) {
      await this.handleResolveLabel(payload)
    }

    // If the label added is "I2PR: Resolve Issue", start the autoResolveIssue workflow
    if (labelName === AUTO_RESOLVE_LABEL) {
      await this.handleAutoResolveLabel(payload)
    }
  }

  private async handleResolveLabel(payload: IssuesPayload): Promise<void> {
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

    // Read API key for the user who added the label
    const settingsReader = makeSettingsReaderAdapter({
      getSession: () => neo4jDs.getSession(),
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

    // Launch resolveIssue as a background job (fire-and-forget)
    ;(async () => {
      try {
        const jobId = uuidv4()

        await updateJobStatus(
          jobId,
          'Received "resolve" label on issue. Starting resolveIssue workflow.'
        )

        const fullRepo = await getRepoFromString(repoFullName)
        const issue = await getIssue({
          fullName: repoFullName,
          issueNumber,
        })

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
    })()
  }

  private async handleAutoResolveLabel(payload: IssuesPayload): Promise<void> {
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

    // Preflight check: ensure the user has an API key
    const settingsReader = makeSettingsReaderAdapter({
      getSession: () => neo4jDs.getSession(),
      userRepo: userRepo,
    })
    const apiKeyResult = await settingsReader.getOpenAIKey(labelerLogin)
    if (!apiKeyResult.ok || !apiKeyResult.value) {
      console.error(
        `Missing OpenAI API key for user ${labelerLogin}. Skipping autoResolveIssue.`
      )
      return
    }

    ;(async () => {
      try {
        const jobId = uuidv4()

        await updateJobStatus(
          jobId,
          'Received "I2PR: Resolve Issue" label on issue. Starting autoResolveIssue workflow.'
        )

        const fullRepo = await getRepoFromString(repoFullName)
        const issue = await getIssue({
          fullName: repoFullName,
          issueNumber,
        })

        if (issue.type !== "success") {
          console.error("Failed to get issue:", issue)
          return
        }

        // Create GitHub App Auth adapter for webhook context
        const webhookAuthAdapter: AuthReaderPort = {
          async getAuthenticatedUser() {
            // In webhook context, return the labeler as the "authenticated" user
            return {
              id: labelerLogin,
              githubLogin: labelerLogin,
            }
          },
          async getAccessToken() {
            // Get installation token for GitHub App authentication
            const token = await getInstallationTokenFromRepo({
              owner: fullRepo.owner.login,
              repo: fullRepo.name,
            })
            return {
              access_token: token,
              refresh_token: "",
              expires_at: Math.floor(Date.now() / 1000) + 3600,
              expires_in: 3600,
              scope: "",
              token_type: "installation",
              id_token: "",
            }
          },
          async getAuth() {
            const user = await this.getAuthenticatedUser()
            const token = await this.getAccessToken()
            if (!user || !token) {
              return { ok: false, error: "AuthRequired" as const }
            }
            return { ok: true, value: { user, token } }
          },
        }

        await autoResolveIssue(
          {
            issue: issue.issue,
            repository: fullRepo,
            jobId,
          },
          {
            auth: webhookAuthAdapter,
            settings: settingsReader,
          }
        )
      } catch (e) {
        console.error("Failed to run autoResolveIssue workflow from label:", e)
      }
    })()
  }
}
