// src-oop/examples/comparison.ts
// Example comparing functional vs OOP implementations

// ========================================
// FUNCTIONAL APPROACH (from /src)
// ========================================

// import { createDefaultRepositorySetup } from '@/src'
//
// const setupRepositoryFunctional = createDefaultRepositorySetup()
//
// const functionalExample = async () => {
//   const repoPath = await setupRepositoryFunctional({
//     repoFullName: 'owner/repo',
//     workingBranch: 'main'
//   })
//   return repoPath
// }

// ========================================
// OBJECT-ORIENTED APPROACH (from /src-oop)
// ========================================

import { createRepositorySetup } from "../index"

const setupRepositoryOOP = createRepositorySetup()

const oopExample = async () => {
  const repoPath = await setupRepositoryOOP.execute({
    repoFullName: "owner/repo",
    workingBranch: "main",
  })
  return repoPath
}

// ========================================
// TESTING COMPARISON
// ========================================

// Functional Testing:
// const mockDeps = {
//   auth: { getAuthentication: () => Promise.resolve({ token: 'test', type: 'user' }) },
//   git: { ensureValidRepo: jest.fn(), setRemoteOrigin: jest.fn(), cleanCheckout: jest.fn() },
//   fs: { getRepoDirectory: () => Promise.resolve('/tmp/repo') },
//   retry: { withRetry: (op) => op() }
// }
// const setupRepo = createSetupRepositoryUseCase(mockDeps)

// OOP Testing:
import { RepositorySetupFactory, RepositoryAuth } from "../index"

const mockAuthService = {
  getAuthentication: jest
    .fn()
    .mockResolvedValue(new RepositoryAuth("test-token", "user")),
}

const mockRepositoryService = {
  setupRepository: jest.fn().mockResolvedValue(undefined),
}

const mockFileSystemService = {
  getRepoDirectory: jest.fn().mockResolvedValue("/tmp/repo"),
  cleanupDirectory: jest.fn().mockResolvedValue(undefined),
}

const mockRetryService = {
  withRetry: jest.fn().mockImplementation((operation) => operation()),
}

const setupRepositoryForTesting = RepositorySetupFactory.createForTesting({
  authService: mockAuthService,
  repositoryService: mockRepositoryService,
  fileSystemService: mockFileSystemService,
  retryService: mockRetryService,
})

const testingExample = async () => {
  await setupRepositoryForTesting.execute({
    repoFullName: "owner/repo",
    workingBranch: "main",
  })

  expect(mockAuthService.getAuthentication).toHaveBeenCalled()
  expect(mockRepositoryService.setupRepository).toHaveBeenCalled()
  expect(mockFileSystemService.getRepoDirectory).toHaveBeenCalledWith(
    "owner/repo"
  )
}

// ========================================
// DEPENDENCY INJECTION COMPARISON
// ========================================

// Functional DI (Higher-order functions):
// const setupRepo = createSetupRepositoryUseCase({
//   auth: createAuthenticationProvider(),
//   git: createGitOperations(),
//   fs: createFileSystemOperations()
// })

// OOP DI (Constructor injection):
import { DependencyContainer } from "../index"

const container = new DependencyContainer()
const setupRepositoryWithDI = container.createSetupRepositoryUseCase()

// Access individual services if needed
const authService = container.authService
const gitOperations = container.gitOperations

export {
  oopExample,
  testingExample,
  setupRepositoryWithDI,
  authService,
  gitOperations,
}
