import { Issue } from "@shared/entities/Issue"
import type { AuthReaderPort } from "@shared/ports/auth/reader"
import type { IssueReaderPort } from "@shared/ports/github/issue.reader"
import type { LLMPort } from "@shared/ports/llm"
import type { SettingsReaderPort } from "@shared/ports/repositories/settings.reader"

/**
 * Parameters for resolving an issue
 */
export interface ResolveIssueParams {
  /** Repository full name (e.g., "owner/repo") */
  repoFullName: string
  /** Issue number */
  issueNumber: number
  /** Optional model override for LLM */
  model?: string
  /** Optional max tokens for LLM response */
  maxTokens?: number
}

/**
 * Result of issue resolution
 */
export interface ResolveIssueResult {
  /** The original issue (null if failed to fetch) */
  issue: Issue | null
  /** LLM's response/solution */
  response: string
  /** Whether the issue was successfully analyzed */
  success: boolean
  /** Error message if resolution failed */
  error?: string
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
    auth: AuthReaderPort
    settings: SettingsReaderPort
    llm: LLMPort | ((apiKey: string) => LLMPort)
    issueReader: IssueReaderPort | ((token: string) => IssueReaderPort)
  },
  params: ResolveIssueParams
): Promise<ResolveIssueResult> {
  const { auth, settings } = ports
  try {
    // =================================================
    // Step 1: Get login and token
    // =================================================
    const authResult = await auth.getAuth()
    if (!authResult.ok) {
      return {
        issue: null,
        response: "",
        success: false,
        error: authResult.error,
      }
    }
    const { user: login, token } = authResult.value

    // =================================================
    // Step 2: Fetch the issue details
    // =================================================
    const issueReaderPort: IssueReaderPort =
      typeof ports.issueReader === "function"
        ? (ports.issueReader as (token: string) => IssueReaderPort)(
            token.access_token
          )
        : ports.issueReader

    const issueResult = await issueReaderPort.getIssue({
      repoFullName: params.repoFullName,
      number: params.issueNumber,
    })

    if (!issueResult.ok) {
      return {
        issue: null,
        response: "",
        success: false,
        error: `Failed to fetch issue: ${issueResult.error}`,
      }
    }

    const issue = Issue.fromDetails(issueResult.value)

    if (!issue.isResolvable) {
      return {
        issue,
        response: "This issue is already closed and cannot be resolved.",
        success: false,
        error: "Issue is not open",
      }
    }

    // =================================================
    // Step 3: Get OpenAI API key
    // =================================================
    const apiKeyResult = await settings.getOpenAIKey(login.githubLogin)
    if (!apiKeyResult.ok || !apiKeyResult.value) {
      return {
        issue: null,
        response: "",
        success: false,
        error: apiKeyResult.ok
          ? "No API key saved for user in settings"
          : `Failed to fetch LLM API key: ${apiKeyResult.error}`,
      }
    }
    const apiKey = apiKeyResult.value
    // =================================================
    // Step 4: Create LLM Port
    // =================================================
    const llmPort: LLMPort =
      typeof ports.llm === "function"
        ? (ports.llm as (apiKey: string) => LLMPort)(apiKey)
        : ports.llm

    // =================================================
    // Step 5: Generate LLM response
    // =================================================
    const userMessage = `Please analyze and provide a solution for this GitHub issue:\n\n${issue.summary}\n\nRepository: ${params.repoFullName}`

    const response = await llmPort.createCompletion({
      system: RESOLUTION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
      model: params.model,
      maxTokens: params.maxTokens,
    })

    return {
      issue,
      response: response.trim(),
      success: true,
    }
  } catch (error) {
    return {
      issue: null,
      response: "",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}
