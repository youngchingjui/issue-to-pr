// TODO: Migrate to /lib/utils/server.ts

// These utils are for server-side code
import "server-only"

import { AsyncLocalStorage } from "node:async_hooks"

// For storing Github App installation ID in async context
const asyncLocalStorage = new AsyncLocalStorage<{ installationId: string }>()

/**
 *
 * @deprecated Do not use asyncLocalStorage. It introduces bugs that I don't understand.
 */
export function runWithInstallationId(
  installationId: string,
  fn: () => Promise<void>
) {
  asyncLocalStorage.run({ installationId }, fn)
}

// TODO: We currently depend on webhooks to provide installation IDs.
// BUT, we should also save installation IDs to neo4j database on the first time we retrieve them.
// They are unique to:
//   - Our Github App (dev-issue-to-pr (local testing) or issuetopr-dev (production)) (confusing, I know)
//   - user / org
export function getInstallationId(): string | null {
  const store = asyncLocalStorage.getStore()
  if (!store) {
    return null
  }
  return store.installationId
}
