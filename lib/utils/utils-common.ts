import { type ClassValue, clsx } from "clsx"
import { EventEmitter } from "events"
import { twMerge } from "tailwind-merge"

import { LOCAL_STORAGE_KEY } from "@/lib/globals"
import { GitHubURLSchema } from "@/lib/schemas/api"
import { GitHubIssue } from "@/lib/types/github"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getApiKeyFromLocalStorage(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem(LOCAL_STORAGE_KEY)
  }
  return null
}

export function getCloneUrlWithAccessToken(
  userRepo: string,
  token: string
): string {
  // userRepo format is "username/repo"
  return `https://${token}@github.com/${userRepo}.git`
}

export const jobStatusEmitter = new EventEmitter()
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
 * Gets the full repository name from a GitHub issue
 * @param issue The GitHub issue object
 * @returns The full repository name in the format "owner/repo", or undefined if repository info is missing
 */
export function getRepoFullNameFromIssue(issue: GitHubIssue): string {
  if (issue.repository?.full_name) {
    return issue.repository.full_name
  } else {
    try {
      const { fullName } = GitHubURLSchema.parse(issue.repository_url)
      return fullName
    } catch (e) {
      console.error(
        "An unexpected error occured when parsing the repository URL",
        e
      )
      throw e
    }
  }
}
