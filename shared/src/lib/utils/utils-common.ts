// TODO: Migrate to /lib/utils/client.ts or /lib/utils/server.ts

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

import { GitHubURLSchema } from "@/shared/lib/schemas/api"
import { type GitHubIssue, type PullRequest } from "@/shared/lib/types/github"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getCloneUrlWithAccessToken(
  userRepo: string,
  token: string
): string {
  // userRepo format is "username/repo"
  // GitHub App installation tokens (prefix "ghs_") must be passed as the password with
  // a fixed username `x-access-token`, per GitHub documentation:
  //docs.github.com/en/enterprise-cloud@latest/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation#about-authentication-as-a-github-app-installation
  // For all other tokens (e.g. OAuth or personal access tokens like `ghp_` or `github_pat_`),
  // embedding the token directly as the username continues to work.
  if (token.startsWith("ghs_")) {
    // Treat as GitHub App installation token -> username is fixed, token is password
    return `https://x-access-token:${token}@github.com/${userRepo}.git`
  }

  // Default behaviour for PAT / OAuth tokens
  return `https://${token}@github.com/${userRepo}.git`
}

// Lightweight event emitter that works in both browser and Node without bundling 'events'
type Listener = (...args: unknown[]) => void
class LightweightEmitter {
  private listeners = new Map<string, Set<Listener>>()

  on(event: string, listener: Listener) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(listener)
    return this
  }

  addListener(event: string, listener: Listener) {
    return this.on(event, listener)
  }

  off(event: string, listener: Listener) {
    this.listeners.get(event)?.delete(listener)
    return this
  }

  removeListener(event: string, listener: Listener) {
    return this.off(event, listener)
  }

  removeAllListeners(event?: string) {
    if (event) this.listeners.delete(event)
    else this.listeners.clear()
    return this
  }

  emit(event: string, ...args: unknown[]) {
    const set = this.listeners.get(event)
    if (!set) return false
    for (const listener of Array.from(set)) listener(...args)
    return true
  }
}

export const jobStatusEmitter = new LightweightEmitter()
export const jobStatus: Record<string, string> = {}

/**
 * Updates the status of a job.
 * @param jobId - The unique identifier for the job.
 * @param status - The current status message for the job.
 */
export function updateJobStatus(jobId: string, status: string) {
  jobStatus[jobId] = status
  jobStatusEmitter.emit("statusUpdate", jobId, status)
}

export const SSEUtils = {
  encodeStatus(status: string): string {
    return status.replace(/\n/g, "\\n")
  },
  decodeStatus(encodedStatus: string): string {
    return encodedStatus.replace(/\\n/g, "\n")
  },
}

/**
 * Derive the deterministic container name used by our workflow utilities.
 * Must stay in sync with container naming logic across the application.
 *
 * @param traceId - The workflow trace/run ID
 * @returns The standardized container name
 */
export function containerNameForTrace(traceId: string): string {
  return `agent-${traceId}`.replace(/[^a-zA-Z0-9_.-]/g, "-")
}

/**
 * Gets the full repository name from a GitHub issue
 * @param issue The GitHub issue object
 * @returns The full repository name in the format "owner/repo", or undefined if repository info is missing
 */
export function getRepoFullNameFromIssue(
  item: GitHubIssue | PullRequest
): string {
  // Issue payloads (REST issues.get)
  const asIssue = item as GitHubIssue
  if (asIssue.repository?.full_name) {
    return asIssue.repository.full_name
  }

  // Pull request payloads (REST pulls.get)
  const asPull = item as PullRequest
  if (asPull.base?.repo?.full_name) {
    return asPull.base.repo.full_name
  }

  // Fall back to parsing API/HTML URLs when embedded repo objects are missing
  const repoUrl =
    ("repository_url" in asIssue && typeof asIssue.repository_url === "string"
      ? asIssue.repository_url
      : undefined) ??
    (asPull.base?.repo?.url || undefined)

  if (!repoUrl) {
    throw new Error("Repository info missing from GitHub payload")
  }

  try {
    const { fullName } = GitHubURLSchema.parse(repoUrl)
    return fullName
  } catch (e) {
    console.error(
      "An unexpected error occured when parsing the repository URL",
      e
    )
    throw e
  }
}
