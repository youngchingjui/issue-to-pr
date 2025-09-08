"use server"

import type { GitHubAuthMethod } from "@shared/adapters/github/IssueReaderAdapter"
import { makeIssueReaderAdapter } from "@shared/adapters/github/IssueReaderAdapter"
import { OpenAIAdapter } from "@shared/adapters/llm/OpenAIAdapter"
import { makeSettingsReaderAdapter } from "@shared/adapters/neo4j/repositories/SettingsReaderAdapter"
import { resolveIssue } from "@shared/usecases/workflows/resolveIssue"

import { nextAuthReader } from "@/lib/adapters/auth/AuthReader"
import * as userRepo from "@/lib/neo4j/repositories/user"

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
  const { repoFullName, issueNumber, model, maxTokens } =
    resolveIssueRequestSchema.parse(input)

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
  const result = await resolveIssue(
    {
      auth: authAdapter,
      settings: settingsAdapter,
      llm: llmAdapter,
      issueReader: issueReaderAdapter,
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
  const serializedIssue = result.issue
    ? {
        ref: {
          repoFullName: result.issue.ref.repoFullName,
          number: result.issue.ref.number,
        },
        title: result.issue.title,
        body: result.issue.body,
        state: result.issue.state,
        url: result.issue.url,
        authorLogin: result.issue.authorLogin,
        labels: [...result.issue.labels],
        assignees: [...result.issue.assignees],
        createdAt: result.issue.createdAt,
        updatedAt: result.issue.updatedAt,
        closedAt: result.issue.closedAt ?? null,
      }
    : null

  return {
    issue: serializedIssue,
    response: result.response,
    success: result.success,
    error: result.error,
  }
}
