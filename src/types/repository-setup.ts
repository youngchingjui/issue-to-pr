// src/types/repository-setup.ts
export interface SetupRepositoryRequest {
  repoFullName: string
  workingBranch: string
}

export interface RepositoryAuth {
  token: string
  type: "user" | "app"
}

export interface RetryOptions {
  maxAttempts: number
  backoffStrategy: "exponential" | "linear"
  retryableErrors: Array<new (...args: any[]) => Error>
}

export interface Dependencies {
  auth: AuthenticationProvider
  git: GitOperations
  fs: FileSystemOperations
  github: GitHubApi
  retry: RetryService
  context: InstallationContext
}

// Provider interfaces
export interface AuthenticationProvider {
  getAuthentication: () => Promise<RepositoryAuth>
}

export interface GitOperations {
  ensureValidRepo: (path: string, cloneUrl: string) => Promise<void>
  setRemoteOrigin: (path: string, url: string) => Promise<void>
  cleanCheckout: (branch: string, path: string) => Promise<void>
  cleanup: (path: string) => Promise<void>
  clone: (cloneUrl: string, path: string) => Promise<void>
}

export interface FileSystemOperations {
  getRepoDirectory: (repoFullName: string) => Promise<string>
  cleanup: (path: string) => Promise<void>
}

export interface GitHubApi {
  getRepository: (owner: string, repo: string) => Promise<{ clone_url: string }>
}

export interface RetryService {
  withRetry: <T>(
    operation: () => Promise<T>,
    options?: RetryOptions
  ) => Promise<T>
}

export interface InstallationContext {
  getInstallationId: () => string | null
  runWithInstallationId: <T>(id: string, fn: () => Promise<T>) => Promise<T>
}
