// src/infrastructure/context/installation-context.ts
import { AsyncLocalStorage } from "node:async_hooks"

import type { InstallationContext } from "../../types/repository-setup"

const asyncLocalStorage = new AsyncLocalStorage<{ installationId: string }>()

export const createInstallationContext = (): InstallationContext => ({
  getInstallationId: (): string | null => {
    const store = asyncLocalStorage.getStore()
    return store?.installationId ?? null
  },

  runWithInstallationId: async <T>(
    installationId: string,
    fn: () => Promise<T>
  ): Promise<T> => {
    return asyncLocalStorage.run({ installationId }, fn)
  },
})
