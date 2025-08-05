// src-oop/infrastructure/context/InstallationContext.ts
import { AsyncLocalStorage } from "node:async_hooks"
import { IInstallationContext } from "../../types/repository-setup"

export class InstallationContext implements IInstallationContext {
  private readonly asyncLocalStorage = new AsyncLocalStorage<{
    installationId: string
  }>()

  getInstallationId(): string | null {
    const store = this.asyncLocalStorage.getStore()
    return store?.installationId ?? null
  }

  async runWithInstallationId<T>(
    installationId: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return this.asyncLocalStorage.run({ installationId }, fn)
  }
}
