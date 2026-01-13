import { Issue } from "@/shared/entities/Issue"
import { err, ok, type Result } from "@/shared/entities/result"
import type { EventBusPort } from "@/shared/ports/events/eventBus"
import { createWorkflowEventPublisher } from "@/shared/ports/events/publisher"
import type { IssueReaderPort } from "@/shared/ports/github/issue.reader"
import type { LLMPort } from "@/shared/ports/llm"
import type { SettingsReaderPort } from "@/shared/ports/repositories/settings.reader"

/**
 * Parameters for resolving an issue
 */
export interface ResolveIssueParams {
  /** User GitHub login, in order to lookup their OpenAI API key */
  login: string
  /** Repository full name (e.g., "owner/repo") */
  repoFullName: string
  /** Issue number */
  issueNumber: number
  /** Optional model override for LLM */
  model?: string
  /** Optional max tokens for LLM response */
  maxTokens?: number
  /** Optional workflow id for emitting events */
  workflowId?: string
}

/**
 * Result of issue resolution
 */
export type ResolveIssueErrorCode =
  | "AUTH_REQUIRED"
  | "ISSUE_FETCH_FAILED"
  | "ISSUE_NOT_OPEN"
  | "MISSING_API_KEY"
  | "LLM_ERROR"
  | "UNKNOWN"

export interface ResolveIssueErrorDetails {
  /** Optional issue instance if we already fetched it before failing */
  issue?: Issue
  /** Minimal reference; safe to return */
  issueRef?: { repoFullName: string; number: number }
}

export interface ResolveIssueOk {
  /** The fetched and validated issue */
  issue: Issue
  /** LLM's response/solution */
  response: string
}

/**
 * System prompt for issue resolution
 */
const RESOLUTION_SYSTEM_PROMPT = `You are an expert software engineer and GitHub issue resolver. Your task is to analyze GitHub issues and provide clear, actionable solutions.

When given an issue, you should:
1. Understand the problem or request clearly
2. Provide a step-by-step solution or approach
3. Include relevant code examples if applicable
4. Suggest testing approaches
5. Consider edge cases and potential complications

Guidelines:
- Be concise but comprehensive
- Use clear, technical language
- Provide actionable steps
- Include code snippets when helpful
- Consider the repository context
- Suggest follow-up actions if needed

Format your response as a clear, structured solution that a developer can follow.`

/**
 * Use case: Resolve a GitHub issue using an LLM agent
 *
 * This follows clean architecture principles:
 * - Ports are injected for external dependencies (LLM, GitHub)
 * - Business logic is pure and testable
 * - No direct dependencies on external services
 */
export async function resolveIssue(
  ports: {
    settings: SettingsReaderPort
    llm: LLMPort | ((apiKey: string) => LLMPort)
    issueReader: IssueReaderPort
    eventBus?: EventBusPort
  },
  params: ResolveIssueParams
): Promise<
  Result<ResolveIssueOk, ResolveIssueErrorCode, ResolveIssueErrorDetails>
> {
  const { settings, eventBus, issueReader } = ports
  const pub = createWorkflowEventPublisher(eventBus, params.workflowId)

  try {
    // =================================================
    // Step 1: Fetch the issue details
    // =================================================

    pub.workflow.started(
      `Resolving issue #${params.issueNumber} in ${params.repoFullName}`
    )

    const issueResult = await issueReader.getIssue({
      repoFullName: params.repoFullName,
      number: params.issueNumber,
    })

    if (!issueResult.ok) {
      pub.workflow.error(
        `Failed to fetch Issue #${params.issueNumber}, ${params.repoFullName}`
      )
      return err("ISSUE_FETCH_FAILED", {
        issueRef: {
          repoFullName: params.repoFullName,
          number: params.issueNumber,
        },
      })
    }

    const issue = Issue.fromDetails(issueResult.value)

    pub.github.issue.fetched(`Fetched issue #${issue.ref.number}`, {
      state: issue.state,
      repoFullName: params.repoFullName,
      number: params.issueNumber,
    })

    if (!issue.isResolvable) {
      pub.workflow.error(`Issue #${issue.ref.number} is not open/resolvable`)
      return err("ISSUE_NOT_OPEN", { issue, issueRef: issue.ref })
    }

    // =================================================
    // Step 2: Get OpenAI API key
    // =================================================
    const apiKeyResult = await settings.getOpenAIKey(params.login)
    if (!apiKeyResult.ok || !apiKeyResult.value) {
      pub.workflow.error("Missing OpenAI API key")
      return err("MISSING_API_KEY")
    }
    const apiKey = apiKeyResult.value
    // =================================================
    // Step 3: Create LLM Port
    // =================================================
    const llmPort: LLMPort =
      typeof ports.llm === "function"
        ? (ports.llm as (apiKey: string) => LLMPort)(apiKey)
        : ports.llm

    // =================================================
    // Step 4: Generate LLM response
    // =================================================
    const userMessage = `Please analyze and provide a solution for this GitHub issue:\n\n${issue.summary}\n\nRepository: ${params.repoFullName}`

    try {
      pub.llm.started("Requesting completion from LLM")

      const llmResult = await llmPort.createCompletion({
        system: RESOLUTION_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
        model: params.model,
        maxTokens: params.maxTokens,
      })

      if (!llmResult.ok) {
        pub.workflow.error("LLM returned an error")
        return err("LLM_ERROR", { issueRef: issue.ref })
      }

      pub.llm.completed("LLM completed successfully")

      pub.workflow.completed("ResolveIssue workflow completed")

      return ok({
        issue,
        response: llmResult.value.trim(),
      })
    } catch {
      // Intentionally do not surface upstream error details to avoid leaking sensitive info
      pub.workflow.error("LLM call failed")
      return err("LLM_ERROR", { issueRef: issue.ref })
    }
  } catch {
    // Fallback unknown error; do not leak raw error messages
    pub.workflow.error("Unknown error occurred")
    return err("UNKNOWN")
  }
}
