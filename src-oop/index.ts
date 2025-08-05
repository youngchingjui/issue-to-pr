// src-oop/index.ts - Main entry point for OOP implementation

// Export main interfaces and types
export type {
  SetupRepositoryRequest,
  RetryOptions,
  IAuthenticationService,
  IRepositoryService,
  IFileSystemService,
  IRetryService,
} from "./types/repository-setup"

export { RepositoryAuth } from "./types/repository-setup"

// Export factory and container
export { RepositorySetupFactory } from "./interface/RepositorySetupFactory"
export { DependencyContainer } from "./interface/DependencyContainer"

// Export main use case
export { SetupRepositoryUseCase } from "./application/SetupRepositoryUseCase"

// Export domain services for advanced usage
export { AuthenticationService } from "./domain/auth/AuthenticationService"
export { RepositoryService } from "./domain/repository/RepositoryService"
export { RetryService } from "./domain/resilience/RetryService"

// Convenience functions
export const createRepositorySetup = () => {
  return RepositorySetupFactory.create()
}

export const createRepositorySetupWithContainer = () => {
  const container = new DependencyContainer()
  return container.createSetupRepositoryUseCase()
}

// Usage examples in comments:
//
// Simple usage:
// import { createRepositorySetup } from '@/src-oop'
// const setupRepo = createRepositorySetup()
// const path = await setupRepo.execute({ repoFullName: 'owner/repo', workingBranch: 'main' })
//
// Advanced usage with container:
// import { DependencyContainer } from '@/src-oop'
// const container = new DependencyContainer()
// const setupRepo = container.createSetupRepositoryUseCase()
// const path = await setupRepo.execute({ repoFullName: 'owner/repo', workingBranch: 'main' })
//
// Testing usage:
// import { RepositorySetupFactory } from '@/src-oop'
// const setupRepo = RepositorySetupFactory.createForTesting({
//   authService: mockAuthService,
//   repositoryService: mockRepositoryService
// })
