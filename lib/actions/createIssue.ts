"use server"

import { makeIssueWriterAdapter } from "@shared/adapters/github/octokit/rest/issue.writer"
import { createIssueForRepo } from "@shared/services/github/issues"

import { auth } from "@/auth"
import { getChatCompletion } from "@/lib/openai"
import { upsertIssueRequirements } from "@/lib/neo4j/services/issue"

import {
  CreateIssueActionParams,
  type CreateIssueActionResult,
  createIssueActionSchema,
} from "./schemas"

export function createIssueAction(
  input: CreateIssueActionParams
): Promise<CreateIssueActionResult>
export async function createIssueAction(
  input: unknown
): Promise<CreateIssueActionResult> {
  const parsed = createIssueActionSchema.safeParse(input)
  if (!parsed.success) {
    const flattened = parsed.error.flatten()
    return {
      status: "error",
      code: "ValidationFailed",
      message: "Invalid input. Please check the highlighted fields.",
      issues: parsed.error.issues?.map((i) => i.message) ?? [],
      fieldErrors: flattened.fieldErrors as Record<string, string[]>,
    }
  }

  // Composition: wire concrete adapter using the current user's token
  const session = await auth()
  const token = session?.token?.access_token
  if (!token || typeof token !== "string") {
    return {
      status: "error",
      code: "AuthRequired",
      message: "Please reconnect your GitHub account.",
    }
  }

  const githubAdapter = makeIssueWriterAdapter({ token })
  const res = await createIssueForRepo(githubAdapter, parsed.data)

  if (res.ok) {
    // Fire-and-forget: generate requirements markdown and store in Neo4j
    const { owner, repo, body } = parsed.data
    const repoFullName = `${owner}/${repo}`
    const issueNumber = res.value.number

    if (body && body.trim()) {
      ;(async () => {
        try {
          if (!process.env.OPENAI_API_KEY) return
          const systemPrompt =
            "You extract clear, concise, testable software requirements."
          const userPrompt = `Rewrite the following issue description as a bullet list of concrete requirements.\n\nRules:\n- Use markdown bullets (\"-\") only\n- Be specific and actionable\n- No preamble or epilogue, just the list\n\nDescription:\n${body}`
          const requirements = await getChatCompletion({
            systemPrompt,
            userPrompt,
          })

          if (requirements && requirements.trim()) {
            await upsertIssueRequirements({
              repoFullName,
              issueNumber,
              requirements: requirements.trim(),
            })
          }
        } catch (err) {
          console.error("Failed to generate/store requirements:", err)
        }
      })()
    }

    return {
      status: "success",
      issueUrl: res.value.url,
      number: res.value.number,
    }
  }

  // Return only machine-readable code and optional details; UI will map to copy
  return { status: "error", code: res.error, message: res.error }
}

