import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

import { LOCAL_STORAGE_KEY } from "@/lib/globals"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getApiKeyFromLocalStorage(): string | null {
  return localStorage.getItem(LOCAL_STORAGE_KEY)
}
