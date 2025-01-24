import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

import { LOCAL_STORAGE_KEY } from "@/lib/globals"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getApiKeyFromLocalStorage(): string | null {
  return localStorage.getItem(LOCAL_STORAGE_KEY)
}

export function getCloneUrlWithAccessToken(
  userRepo: string,
  token: string
): string {
  // userRepo format is "username/repo", like "youngchingjui/issue-to-pr"
  return `https://${token}@github.com/${userRepo}.git`
}
