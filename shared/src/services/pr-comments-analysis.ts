import type { LLMPort } from "@/shared/src/core/ports/llm"

export type PRGeneralComment = {
  author?: string | null
  body: string
  createdAt?: string
}

export type PRReviewComment = {
  author?: string | null
  body: string
  file?: string | null
  diffHunk?: string | null
  createdAt?: string
}

export type IssueContext = {
  repoFullName: string
  number: number
  title?: string | null
  body?: string | null
}

export type AnalyzePRCommentsInput = {
  repoFullName: string
  pullNumber: number
  prTitle: string
  prBody?: string | null
  diff?: string | null
  issue: IssueContext
  generalComments: PRGeneralComment[]
  reviewComments?: PRReviewComment[]
  model?: string // allow callers to request a specific model like "gpt-5"
}

export type AnalyzePRCommentsOutput = {
  summary: string
  misconceptions?: string[]
  missingRequirements?: string[]
  verificationGaps?: string[]
  suggestedIssueUpdateMarkdown: string
}

/**
 * Pure service that analyzes a PR and its comments to propose improvements
 * to the original issue. Depends only on the LLMPort and plain data types.
 */
export async function analyzePRAndProposeIssueUpdates(
  llm: LLMPort,
  input: AnalyzePRCommentsInput
): Promise<AnalyzePRCommentsOutput> {
  const {
    repoFullName,
    pullNumber,
    prTitle,
    prBody,
    diff,
    issue,
    generalComments,
    reviewComments = [],
    model = "gpt-5", // caller can override; default hints at a strong thinking model
  } = input

  const system = [
    "You are a senior engineering analyst.",
    "Given a pull request and its comments, identify problems in the original issue and propose concrete, actionable updates.",
    "Return concise, high-signal findings and a ready-to-post Markdown update for the issue.",
  ].join(" ")

  // Prepare a compact textual context for the model
  const commentsText = [
    generalComments.length
      ? `General PR Comments (latest first):\n${generalComments
          .slice(-50)
          .map((c) => `- ${c.author ?? "anon"}: ${c.body}`)
          .join("\n")}`
      : "General PR Comments: (none)",
    reviewComments.length
      ? `\n\nReview Comments (latest first):\n${reviewComments
          .slice(-100)
          .map((c) => `- ${c.author ?? "anon"} on ${c.file ?? "(no-file)"}: ${c.body}`)
          .join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("")

  const prompt = [
    `Repository: ${repoFullName}`,
    `Pull Request #${pullNumber}: ${prTitle}`,
    prBody ? `\nPR Description:\n${prBody}` : "",
    diff ? `\n\nDiff (truncated if large):\n${diff.slice(0, 30_000)}` : "",
    `\n\nLinked Issue #${issue.number}${
      issue.title ? `: ${issue.title}` : ""
    }`,
    issue.body ? `\nCurrent Issue Body:\n${issue.body}` : "",
    `\n\n${commentsText}`,
    `\n\nTASK: Based on the PR and discussion, analyze what was missing, incorrect, or ambiguous in the original issue. Identify:\n- Misconceptions or incorrect assumptions\n- Missing or updated requirements\n- Unverified constraints or acceptance criteria that should be explicit\n\nThen propose a Markdown update that can be posted as a comment to the issue including:\n- Summary of key findings\n- Bullet list of concrete, actionable updates to the issue\n- Optional clarifying questions if more info is needed`,
  ].join("\n")

  const content = await llm.createCompletion({
    system,
    model,
    messages: [
      { role: "user", content: prompt },
    ],
    maxTokens: 1200,
  })

  // We keep parsing light-touch to avoid coupling to a specific model.
  // Heuristically split out sections from the returned text.
  const suggestedIssueUpdateMarkdown = content.trim()

  // Provide an extremely lightweight summary extraction as best-effort.
  const summary = suggestedIssueUpdateMarkdown.split("\n")[0]?.slice(0, 240) ||
    "Proposed updates based on PR comments."

  return {
    summary,
    suggestedIssueUpdateMarkdown,
  }
}

export default analyzePRAndProposeIssueUpdates

