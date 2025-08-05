# Object-Oriented Clean Architecture Implementation

This folder contains the object-oriented implementation of the repository setup functionality, following clean architecture principles.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ INTERFACE LAYER (Dependency Injection & Configuration)         │
│ ├─ RepositorySetupFactory (Singleton pattern)                  │
│ └─ DependencyContainer (Instance-based DI)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ APPLICATION LAYER (Use Cases & Orchestration)                  │
│ └─ SetupRepositoryUseCase                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ DOMAIN LAYER (Business Logic & Rules)                          │
│ ├─ AuthenticationService                                        │
│ ├─ RepositoryService                                            │
│ ├─ RetryService                                                 │
│ ├─ CloneUrlBuilder (static utility)                            │
│ ├─ AuthenticationValidator (static utility)                    │
│ └─ RepositoryRequestValidator (static utility)                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ INFRASTRUCTURE LAYER (External Concerns)                       │
│ ├─ SessionAuthProvider                                          │
│ ├─ GitHubAppAuthProvider                                        │
│ ├─ GitHubApiClient                                              │
│ ├─ LocalFileSystemService                                       │
│ ├─ GitOperations                                                │
│ └─ InstallationContext                                          │
└─────────────────────────────────────────────────────────────────┘
```

## File structure

src-oop/
├── types/repository-setup.ts # Interfaces & value objects
├── domain/
│ ├── auth/AuthenticationService.ts # Auth business logic
│ ├── repository/RepositoryService.ts # Repository business logic  
│ └── resilience/RetryService.ts # Retry business logic
├── infrastructure/
│ ├── auth/
│ │ ├── SessionAuthProvider.ts # NextAuth integration
│ │ └── GitHubAppAuthProvider.ts # GitHub App auth
│ ├── github/GitHubApiClient.ts # GitHub API calls
│ ├── filesystem/LocalFileSystemService.ts # File operations
│ ├── git/GitOperations.ts # Git CLI operations
│ └── context/InstallationContext.ts # AsyncLocalStorage wrapper
├── application/SetupRepositoryUseCase.ts # Main orchestration
├── interface/
│ ├── RepositorySetupFactory.ts # Singleton factory
│ └── DependencyContainer.ts # Instance-based DI
├── examples/comparison.ts # Usage examples
├── README.md # Architecture documentation
└── index.ts # Public API

## Key OOP Principles Applied

### 1. **Dependency Injection**

- All dependencies are injected through constructors
- No hardcoded dependencies in business logic
- Interfaces define contracts between layers

### 2. **Single Responsibility Principle**

- Each class has one reason to change
- `AuthenticationService` only handles auth orchestration
- `RepositoryService` only handles repository setup logic
- `RetryService` only handles retry logic

### 3. **Interface Segregation**

- Small, focused interfaces (`IAuthenticationService`, `IRetryService`)
- Classes only depend on interfaces they actually use
- No fat interfaces with unused methods

### 4. **Dependency Inversion**

- High-level modules (domain services) don't depend on low-level modules (infrastructure)
- Both depend on abstractions (interfaces)
- Infrastructure implements domain-defined interfaces

### 5. **Encapsulation**

- Private methods and properties where appropriate
- Public API is minimal and focused
- Internal implementation details are hidden

## Usage Examples

### Simple Usage (Singleton Factory)

```typescript
import { createRepositorySetup } from "@/src-oop"

const setupRepository = createRepositorySetup()

const repoPath = await setupRepository.execute({
  repoFullName: "owner/repo",
  workingBranch: "main",
})
```

### Advanced Usage (Dependency Container)

```typescript
import { DependencyContainer } from "@/src-oop"

const container = new DependencyContainer()
const setupRepository = container.createSetupRepositoryUseCase()

// You can also access individual services
const authService = container.authService
const gitOperations = container.gitOperations

const repoPath = await setupRepository.execute({
  repoFullName: "owner/repo",
  workingBranch: "main",
})
```

### Testing Usage

```typescript
import { RepositorySetupFactory } from "@/src-oop"

// Mock dependencies for testing
const mockAuthService = {
  getAuthentication: jest
    .fn()
    .mockResolvedValue(new RepositoryAuth("test-token", "user")),
}

const setupRepository = RepositorySetupFactory.createForTesting({
  authService: mockAuthService,
  // ... other mocks
})

await setupRepository.execute({
  repoFullName: "owner/repo",
  workingBranch: "main",
})

expect(mockAuthService.getAuthentication).toHaveBeenCalled()
```

## Benefits of This OOP Approach

### ✅ **Clear Contracts**

- Interfaces make dependencies explicit
- Easy to understand what each service needs
- Compile-time checking of dependencies

### ✅ **Encapsulation**

- Related data and behavior grouped together
- Private methods hide implementation details
- Clear public APIs

### ✅ **Polymorphism**

- Easy to swap implementations (different auth providers)
- Runtime behavior changes through interfaces
- Plugin architecture possible

### ✅ **Testability**

- Mock interfaces easily
- Isolated unit testing
- Dependency injection makes testing straightforward

### ✅ **Extensibility**

- Add new implementations without changing existing code
- Decorator pattern for additional functionality
- Strategy pattern for different behaviors

## Trade-offs vs Functional Approach

### **OOP Advantages:**

- **Explicit contracts** through interfaces
- **Stateful services** when needed (RetryService configuration)
- **Team coordination** through clear API boundaries
- **Framework integration** (many DI frameworks expect classes)

### **OOP Disadvantages:**

- **More ceremony** (interfaces, constructors, dependency wiring)
- **Complexity** (more files, more abstraction layers)
- **Memory overhead** (object instances, method binding)
- **Mocking complexity** (need to mock entire interfaces)

## When to Choose OOP

Choose this OOP approach when:

- Working with large teams that need explicit contracts
- Building plugin architectures
- Need complex state management
- Framework requires classes
- Team prefers object-oriented patterns

Choose the functional approach when:

- Working with smaller teams
- Prefer simplicity and directness
- Functional programming is team standard
- Performance is critical
- Rapid prototyping and iteration

Both approaches achieve the same clean architecture goals - the choice depends on team preferences and project requirements.
