import { type ClassValue, clsx } from "clsx"
import { EventEmitter } from "events"
import { twMerge } from "tailwind-merge"

import { LOCAL_STORAGE_KEY } from "@/lib/globals"

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
