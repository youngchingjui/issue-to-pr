// src/interface/repository-setup-factory.ts
import { createSetupRepositoryUseCase } from "../application/setup-repository-use-case"
import { createRetryService } from "../domain/resilience/retry-service"
import { createAuthenticationProvider } from "../infrastructure/auth/auth-provider-factory"
import { createInstallationContext } from "../infrastructure/context/installation-context"
import { createLocalFileSystem } from "../infrastructure/filesystem/local-filesystem"
import { createGitOperations } from "../infrastructure/git/git-operations"
import { createGitHubApiClient } from "../infrastructure/github/github-api-client"
import type { Dependencies } from "../types/repository-setup"

export const createRepositorySetupFactory = () => {
  // Create all dependencies
  const context = createInstallationContext()

  const dependencies: Dependencies = {
    auth: createAuthenticationProvider(context),
    git: createGitOperations(),
    fs: createLocalFileSystem(),
    github: createGitHubApiClient(),
    retry: createRetryService(),
    context,
  }

  // Return the configured use case
  return createSetupRepositoryUseCase(dependencies)
}

// Convenience function for direct use
export const createDefaultRepositorySetup = () => {
  return createRepositorySetupFactory()
}
