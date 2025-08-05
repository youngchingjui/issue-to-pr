// src/index.ts - Main entry point
export {
  createDefaultRepositorySetup,
  createRepositorySetupFactory,
} from "./interface/repository-setup-factory"
export type {
  RepositoryAuth,
  SetupRepositoryRequest,
} from "./types/repository-setup"

// Usage example:
// import { createDefaultRepositorySetup } from '@/src'
//
// const setupRepository = createDefaultRepositorySetup()
//
// const repoPath = await setupRepository({
//   repoFullName: 'owner/repo',
//   workingBranch: 'main'
// })
