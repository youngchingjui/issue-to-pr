import { Issue } from "@shared/entities/Issue"
import { err, ok, type Result } from "@shared/entities/result"
import type { EventBusPort } from "@shared/ports/events/eventBus"
import { createWorkflowEventPublisher } from "@shared/ports/events/publisher"
import type { GitHubRefsPort } from "@shared/ports/refs"
import type { IssueReaderPort } from "@shared/ports/github/issue.reader"
import type { AuthReaderPort } from "@shared/ports/auth/reader"
import type { SettingsReaderPort } from "@shared/ports/repositories/settings.reader"
import type { LLMPort } from "@shared/ports/llm"
import { generateNonConflictingBranchName } from "@shared/usecases/git/generateBranchName"

export interface AutoResolveIssueParams {
  repoFullName: string
  issueNumber: number
  /** Optional explicit branch to use, bypassing generation */
  branch?: string
  /** Optional workflow id for event emission */
  workflowId?: string
}

export type AutoResolveIssueErrorCode =
  | "AUTH_REQUIRED"
  | "ISSUE_FETCH_FAILED"
  | "ISSUE_NOT_OPEN"
  | "MISSING_API_KEY"
  | "BRANCH_GENERATION_FAILED"
  | "UNKNOWN"

export interface AutoResolveIssueOk {
  issue: Issue
  apiKey: string
  workingBranch: string
}

/**
 * Prepare the inputs and context needed to run the Auto Resolve workflow.
 * - Authenticates user
 * - Fetches issue and validates it's resolvable
 * - Resolves API key
 * - Determines working branch (explicit or generated)
 *
 * This function focuses on orchestration and event emission; callers can
 * continue with environment setup and agent execution.
 */
export async function prepareAutoResolveIssue(
  ports: {
    auth: AuthReaderPort
    settings: SettingsReaderPort
    llm: LLMPort | ((apiKey: string) => LLMPort)
    refs: GitHubRefsPort
    issueReader: IssueReaderPort | ((token: string) => IssueReaderPort)
    eventBus?: EventBusPort
  },
  params: AutoResolveIssueParams
): Promise<
  Result<AutoResolveIssueOk, AutoResolveIssueErrorCode, { issue?: Issue }>
> {
  const pub = createWorkflowEventPublisher(ports.eventBus, params.workflowId)

  try {
    // Auth
    const authResult = await ports.auth.getAuth()
    if (!authResult.ok) {
      pub.workflow.error("Authentication required")
      return err("AUTH_REQUIRED")
    }
    const { token } = authResult.value

    // Fetch Issue
    const issueReaderPort:
      | IssueReaderPort
      | ((token: string) => IssueReaderPort) = ports.issueReader
    const issueReader:
      | IssueReaderPort =
      typeof issueReaderPort === "function"
        ? (issueReaderPort as (token: string) => IssueReaderPort)(
            token.access_token
          )
        : issueReaderPort

    const issueRes = await issueReader.getIssue({
      repoFullName: params.repoFullName,
      number: params.issueNumber,
    })

    if (!issueRes.ok) {
      pub.workflow.error("Failed to fetch issue", {
        repoFullName: params.repoFullName,
        issueNumber: params.issueNumber,
      })
      return err("ISSUE_FETCH_FAILED")
    }

    const issue = Issue.fromDetails(issueRes.value)
    pub.issue.fetched(`Fetched issue #${issue.ref.number}`, {
      state: issue.state,
    })

    if (!issue.isResolvable) {
      pub.workflow.error("Issue is not open/resolvable")
      return err("ISSUE_NOT_OPEN", { issue })
    }

    // API key
    const apiKeyResult = await ports.settings.getOpenAIKey(
      authResult.value.user.githubLogin
    )
    if (!apiKeyResult.ok || !apiKeyResult.value) {
      pub.workflow.error("Missing OpenAI API key")
      return err("MISSING_API_KEY", { issue })
    }
    const apiKey = apiKeyResult.value

    // Working branch
    let workingBranch = params.branch?.trim()
    if (workingBranch) {
      pub.status(`Using provided branch: ${workingBranch}`)
    } else {
      try {
        const llm: LLMPort =
          typeof ports.llm === "function"
            ? (ports.llm as (apiKey: string) => LLMPort)(apiKey)
            : ports.llm
        const [owner, repo] = params.repoFullName.split("/")
        const context = `GitHub issue title: ${issue.title}\n\n${issue.body ?? ""}`
        workingBranch = await generateNonConflictingBranchName(
          { llm, refs: ports.refs },
          { owner, repo, context, prefix: "feature" }
        )
        pub.status(`Using working branch: ${workingBranch}`)
      } catch (e) {
        pub.status(
          `[WARNING]: Failed to generate non-conflicting branch name; falling back to default branch. Error: ${String(
            e
          )}`
        )
        workingBranch = "main"
      }
    }

    return ok({ issue, apiKey, workingBranch })
  } catch (e) {
    pub.workflow.error("Unknown error occurred during preparation")
    return err("UNKNOWN")
  }
}

