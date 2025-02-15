// These utils are for server-side code

import { AsyncLocalStorage } from "node:async_hooks"

// For storing Github App installation ID in async context
const asyncLocalStorage = new AsyncLocalStorage<{ installationId: string }>()

export function runWithInstallationId(
  installationId: string,
  fn: () => Promise<void>
) {
  asyncLocalStorage.run({ installationId }, fn)
}

export function getInstallationId(): string {
  const store = asyncLocalStorage.getStore()
  if (!store) {
    throw new Error("Installation ID not found in context")
  }
  return store.installationId
}
