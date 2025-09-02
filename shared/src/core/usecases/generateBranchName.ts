import type { LLMPort } from "@shared/core/ports/llm"
import type { GitHubRefsPort } from "@shared/core/ports/refs"

export type GenerateBranchNameParams = {
  owner: string
  repo: string
  /**
   * Stringified context that describes why this branch is being created.
   * Keep it concise; the LLM will use this to propose a descriptive slug.
   */
  context: string
  /** Optional prefix segment like "feature", "fix", "chore". Default: "feature" */
  prefix?: string
  /**
   * If provided, bypasses the refsPort and uses this set of branches for conflict checks.
   */
  existingBranches?: string[]
  /** Max attempts to find a unique suffix if conflicts occur. Default: 20 */
  maxAttempts?: number
}

/**
 * Use case: propose a clean branch name from context and ensure it does not
 * conflict with existing remote branches.
 *
 * Ports are injected for pure, testable logic with no adapters coupled here.
 */
export async function generateNonConflictingBranchName(
  ports: { llm: LLMPort; refs: GitHubRefsPort },
  params: GenerateBranchNameParams
): Promise<string> {
  const prefix = (params.prefix ?? "feature").trim().replace(/\/$/, "")
  const maxAttempts = Math.max(1, params.maxAttempts ?? 20)

  // 1) Load existing branches
  const existing = new Set(
    (
      params.existingBranches ??
      (await ports.refs.listBranches({
        owner: params.owner,
        repo: params.repo,
      }))
    )
      .map((b) => b.trim())
      .filter(Boolean)
  )

  // 2) Ask LLM for a candidate slug from the context
  const system = [
    "You generate short, descriptive Git branch names in kebab-case.",
    "Prefer 3-6 words max. Avoid issue numbers unless present in context.",
    "Return ONLY the branch path (no code blocks, no quotes).",
  ].join(" ")

  const user = `Context:\n${trimToMax(params.context, 2000)}\n\nRespond with only a short kebab-case slug suitable for a branch name. Example: add-dismiss-button-to-toasts`

  const raw = (
    await ports.llm.createCompletion({
      system,
      messages: [{ role: "user", content: user }],
    })
  ).trim()

  // 3) Sanitize and format candidate
  const baseSlug = sanitizeToSlug(raw) || "new-branch"
  let candidate = `${prefix}/${baseSlug}`
  candidate = trimToMax(candidate, 200)

  // 4) Ensure uniqueness by appending numeric suffixes
  if (!existing.has(candidate)) return candidate

  let attempt = 2
  while (attempt <= maxAttempts) {
    const next = trimToMax(`${candidate}-${attempt}`, 200)
    if (!existing.has(next)) return next
    attempt++
  }

  // 5) As a last resort, include a timestamp suffix
  const fallback = trimToMax(`${candidate}-${Date.now()}`, 200)
  if (!existing.has(fallback)) return fallback

  // Extremely unlikely path: random suffix
  return trimToMax(
    `${candidate}-${Math.random().toString(36).slice(2, 8)}`,
    200
  )
}

function sanitizeToSlug(input: string): string {
  const s = input
    .toLowerCase()
    // Replace separators and whitespace with hyphen
    .replace(/[\s_/|]+/g, "-")
    // Remove invalid git ref characters
    .replace(/[~^:\\?*\[\]@{}]+/g, "")
    // Collapse multiple hyphens
    .replace(/-+/g, "-")
    // Trim hyphens and dots
    .replace(/^[.-]+|[.-]+$/g, "")
  // Disallow sequences that end a path segment with .lock or .
  return s
}

function trimToMax(input: string, max: number): string {
  if (input.length <= max) return input
  return input.slice(0, max)
}
