"use server"

import { makeIssueReaderAdapter } from "@shared/adapters/github/IssueReaderAdapter"
import { EventBusAdapter } from "@shared/adapters/ioredis/EventBusAdapter"
import { OpenAIAdapter } from "@shared/adapters/llm/OpenAIAdapter"
import { makeSettingsReaderAdapter } from "@shared/adapters/neo4j/repositories/SettingsReaderAdapter"
import { resolveIssue } from "@shared/usecases/workflows/resolveIssue"

import { nextAuthReader } from "@/lib/adapters/auth/AuthReader"
import * as userRepo from "@/lib/neo4j/repositories/user"
import type { GitHubAuthMethod } from "@/shared/src/ports/github/issue.reader"

import { neo4jDs } from "../neo4j"
import {
  type ResolveIssueRequest,
  resolveIssueRequestSchema,
  type ResolveIssueResult,
} from "./schemas"

// Overload for typed usage
export async function resolveIssueAction(
  input: ResolveIssueRequest
): Promise<ResolveIssueResult>
// Accept unknown at boundary and validate
export async function resolveIssueAction(
  input: unknown
): Promise<ResolveIssueResult>
export async function resolveIssueAction(
  input: unknown
): Promise<ResolveIssueResult> {
  // =================================================
  // Step 1: Parse inputs
  // =================================================

  const parsedInput = resolveIssueRequestSchema.safeParse(input)
  if (!parsedInput.success) {
    return {
      status: "error",
      code: "INVALID_INPUT",
      message: parsedInput.error.message,
    }
  }
  const { repoFullName, issueNumber, model, maxTokens } = parsedInput.data

  // =================================================
  // Step 2: Prepare adapters
  // =================================================
  const issueReaderAdapter = (token: string) =>
    makeIssueReaderAdapter(
      async (): Promise<GitHubAuthMethod> => ({
        type: "oauth_user",
        token,
      })
    )

  const llmAdapter = (apiKey: string) => new OpenAIAdapter(apiKey)

  const settingsAdapter = makeSettingsReaderAdapter({
    getSession: () => neo4jDs.getSession(),
    userRepo: userRepo,
  })

  const authAdapter = nextAuthReader

  // =================================================
  // Step 3: Execute the use case
  // =================================================
  const redisUrl = process.env.REDIS_URL
  const eventBus = redisUrl ? new EventBusAdapter(redisUrl) : undefined
  const result = await resolveIssue(
    {
      auth: authAdapter,
      settings: settingsAdapter,
      llm: llmAdapter,
      issueReader: issueReaderAdapter,
      eventBus,
    },
    {
      repoFullName,
      issueNumber,
      model,
      maxTokens,
    }
  )

  // =================================================
  // Step 4: Serialize and return results
  // =================================================
  if (result.ok) {
    const issue = result.value.issue
    const summary = {
      repoFullName: issue.ref.repoFullName,
      number: issue.ref.number,
      title: issue.title ?? null,
      state: issue.state,
      authorLogin: issue.authorLogin ?? null,
      url: issue.url,
    }
    const payload: ResolveIssueResult = {
      status: "success",
      response: result.value.response,
      issue: summary,
    }
    return payload
  }

  const message = (() => {
    switch (result.error) {
      case "AUTH_REQUIRED":
        return "Authentication required. Please sign in."
      case "ISSUE_FETCH_FAILED":
        return "Failed to fetch the issue. Please check the repository and issue number."
      case "ISSUE_NOT_OPEN":
        return "The issue is not open and cannot be resolved."
      case "MISSING_API_KEY":
        return "LLM API key is not configured. Add your OpenAI API key in settings."
      case "LLM_ERROR":
        return "Failed to generate analysis. Please try again later."
      case "UNKNOWN":
      default:
        return "An unexpected error occurred. Please try again."
    }
  })()

  console.error(result.error, result.details)
  const errorPayload: ResolveIssueResult = {
    status: "error",
    code: result.error,
    message,
    issueRef: result.details?.issueRef,
  }
  return errorPayload
}
