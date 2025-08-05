// src-oop/types/repository-setup.ts
export interface SetupRepositoryRequest {
  repoFullName: string
  workingBranch: string
}

export class RepositoryAuth {
  constructor(
    public readonly token: string,
    public readonly type: "user" | "app"
  ) {}

  isValid(): boolean {
    return Boolean(this.token && this.type)
  }
}

export interface RetryOptions {
  maxAttempts: number
  backoffStrategy: "exponential" | "linear"
  retryableErrors: Array<new (...args: any[]) => Error>
}

// Domain interfaces (contracts)
export interface IAuthenticationService {
  getAuthentication(): Promise<RepositoryAuth>
}

export interface IRepositoryService {
  setupRepository(
    path: string,
    auth: RepositoryAuth,
    request: SetupRepositoryRequest
  ): Promise<void>
}

export interface IFileSystemService {
  getRepoDirectory(repoFullName: string): Promise<string>
  cleanupDirectory(path: string): Promise<void>
}

export interface IGitOperations {
  ensureValidRepo(path: string, cloneUrl: string): Promise<void>
  setRemoteOrigin(path: string, url: string): Promise<void>
  cleanCheckout(branch: string, path: string): Promise<void>
  cleanup(path: string): Promise<void>
  clone(cloneUrl: string, path: string): Promise<void>
}

export interface IGitHubApi {
  getRepository(owner: string, repo: string): Promise<{ clone_url: string }>
}

export interface IRetryService {
  withRetry<T>(
    operation: () => Promise<T>,
    options?: Partial<RetryOptions>
  ): Promise<T>
}

export interface IInstallationContext {
  getInstallationId(): string | null
  runWithInstallationId<T>(id: string, fn: () => Promise<T>): Promise<T>
}

// Authentication provider interfaces
export interface IAuthenticationProvider {
  getAuthentication(): Promise<RepositoryAuth>
}

export interface ISessionAuthProvider extends IAuthenticationProvider {}
export interface IGitHubAppAuthProvider extends IAuthenticationProvider {}
