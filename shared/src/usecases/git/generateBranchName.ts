import { baseBranchSlugSchema, branchPrefixSchema } from "@/entities/refs"
import type { LLMPort } from "@/ports/llm"
import type { GitHubRefsPort } from "@/ports/refs"

const MAX_CONTEXT_LENGTH = 100000
const MAX_ATTEMPTS = 10

export type GenerateBranchNameParams = {
  owner: string
  repo: string
  /**
   * Stringified context that describes why this branch is being created.
   * The LLM will use this to propose a descriptive slug.
   */
  context: string
  /** Optional prefix segment like "feature", "fix", "chore". */
  prefix?: string
  /**
   * If provided, bypasses the refsPort and uses this set of branches for conflict checks.
   */
  existingBranches?: string[]
  /** Max attempts to find a unique suffix if conflicts occur. Default: MAX_ATTEMPTS */
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
  const parsedPrefix = branchPrefixSchema.safeParse(params.prefix)
  if (!parsedPrefix.success) {
    throw new Error("Invalid prefix")
  }
  const prefix = parsedPrefix.data

  const maxAttempts = Math.max(1, params.maxAttempts ?? MAX_ATTEMPTS)

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
    "Keep it short (ideally 3-6 words).",
    "Return ONLY the branch path (no code blocks, no quotes).",
    `${prefix ? `Do NOT provide a prefix in the branch path, we will add this manually.` : ""}`,
  ].join(" ")

  const user = `Context:\n${trimToMax(params.context, MAX_CONTEXT_LENGTH)}\n\nRespond with only a short kebab-case slug suitable for a branch name.`

  const rawResult = await ports.llm.createCompletion({
    system,
    model: "gpt-4.1",
    messages: [{ role: "user", content: user }],
  })
  if (!rawResult.ok) {
    // For this utility use case, fall back to a minimal slug from context
    const fallback = trimToMax(user, 60)
    return prefix ? `${prefix}/${fallback}` : fallback
  }
  const raw = rawResult.value.trim()

  // 3) Parse and format candidate
  const baseSlug = baseBranchSlugSchema.parse(raw)
  const candidate = prefix ? `${prefix}/${baseSlug}` : baseSlug

  // 4) Ensure uniqueness by appending numeric suffixes
  if (!existing.has(candidate)) return candidate

  let attempt = 2
  while (attempt <= maxAttempts) {
    const next = `${candidate}-${attempt}`
    if (!existing.has(next)) return next
    attempt++
  }

  // 5) As a last resort, include a timestamp suffix
  const fallback = `${candidate}-${Date.now()}`
  if (!existing.has(fallback)) return fallback

  // Extremely unlikely path: random suffix
  return `${candidate}-${Math.random().toString(36).slice(2, 8)}`
}

function trimToMax(input: string, max: number): string {
  if (input.length <= max) return input
  return input.slice(0, max)
}
