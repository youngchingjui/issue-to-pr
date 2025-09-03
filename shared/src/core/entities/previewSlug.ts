/**
 * Utilities to build preview subdomain slugs for containers and DNS.
 *
 * Rules:
 * - Compose as: <branch>-<owner>-<repo>
 * - Prefer keeping owner and repo intact; truncate the branch segment when needed.
 * - Soft max length: 55 characters (for nicer URLs)
 * - Hard max length: 63 characters (DNS label limit)
 * - When truncating the branch segment, keep the beginning and append
 *   a 6-char URL-safe id: "-<id>" (7 characters including hyphen)
 */

/** Normalize a string to a URL-safe, kebab-case-like slug. */
export function toKebabSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
}

function shortId6(): string {
  // Base36 alphanumeric, URL-safe
  return Math.random().toString(36).slice(2, 8)
}

export type PreviewSlugParams = {
  branch: string
  owner: string
  repo: string
  /** Soft maximum for the full slug. Default 55. */
  softMax?: number
  /** Hard maximum for the full slug. Default 63 (DNS label limit). */
  hardMax?: number
}

/**
 * Build a preview subdomain slug respecting soft and hard maximum lengths.
 */
export function buildPreviewSubdomainSlug({
  branch,
  owner,
  repo,
  softMax = 55,
  hardMax = 63,
}: PreviewSlugParams): string {
  const branchSlugRaw = toKebabSlug(branch)
  const ownerSlugRaw = toKebabSlug(owner)
  const repoSlugRaw = toKebabSlug(repo)

  // Base composition
  let branchSlug = branchSlugRaw
  let full = [branchSlug, ownerSlugRaw, repoSlugRaw].filter(Boolean).join("-")
  if (full.length <= softMax) return full

  // Prefer truncating only the branch segment, preserving owner/repo
  const fixedTailLen = ownerSlugRaw.length + repoSlugRaw.length + 2 // two hyphens
  let branchMax = softMax - fixedTailLen

  // If we don't have enough room even for 1 char + hyphen + 6 id,
  // try relaxing to the hard limit (63)
  const minBranchWithId = 1 + 1 + 6 // 1 char + '-' + 6 id
  if (branchMax < minBranchWithId) {
    branchMax = hardMax - fixedTailLen
  }

  // Still not enough room? As a last resort, we will squeeze into the hard limit.
  // If even that fails (owner+repo too large), we'll truncate repo, then owner.
  if (branchMax < minBranchWithId) {
    // First, try to shorten repo to make room
    const needed = minBranchWithId - branchMax
    if (repoSlugRaw.length > needed) {
      const newRepo = repoSlugRaw.slice(0, Math.max(1, repoSlugRaw.length - needed))
      return buildPreviewSubdomainSlug({ branch, owner, repo: newRepo, softMax, hardMax })
    }

    // Next, try to shorten owner
    if (ownerSlugRaw.length > needed) {
      const newOwner = ownerSlugRaw.slice(0, Math.max(1, ownerSlugRaw.length - needed))
      return buildPreviewSubdomainSlug({ branch, owner: newOwner, repo, softMax, hardMax })
    }

    // Last ditch: ignore soft max, enforce hard max with minimal branch id
    branchMax = Math.max(minBranchWithId, hardMax - fixedTailLen)
  }

  // Ensure the branch segment includes a unique suffix when truncated
  const suffix = `-${shortId6()}` // 7 chars incl. '-'
  const keep = Math.max(1, branchMax - suffix.length)
  branchSlug = branchSlugRaw.slice(0, keep) + suffix

  full = [branchSlug, ownerSlugRaw, repoSlugRaw].filter(Boolean).join("-")

  // Enforce hard limit just in case
  if (full.length > hardMax) {
    full = full.slice(0, hardMax)
  }

  return full
}

