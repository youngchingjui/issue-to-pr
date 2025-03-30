# Code Structure

This document outlines the organization and purpose of each directory in the project.

## Root Directory Structure

```
/
├── app/                    # Next.js App Router pages and layouts
├── components/            # Reusable React components
├── lib/                   # Core application logic and utilities
├── public/               # Static assets
├── docs/                 # Project documentation
├── scripts/              # Utility and automation scripts
├── test-utils/          # Testing utilities and helpers
├── __tests__/           # Test files
└── docker/              # Docker configuration files
```

## Key Directories Explained

### `/app`

Contains Next.js App Router pages, layouts, and API routes. This is where the main application routing and page components live.

### `/components`

Reusable React components used throughout the application. These are shared UI elements that can be imported and used across different pages.

### `/lib`

Core application logic, utilities, and services. Contains multiple subdirectories:

```
/lib
├── actions/             # Server actions for Next.js
├── agents/             # AI agent implementations
├── auth/               # Authentication-related logic
├── github/            # GitHub API integration and utilities
├── hooks/             # React custom hooks
├── neo4j/             # Neo4j database integration
├── prompts/           # AI prompt templates and configurations
├── schemas/           # Data validation schemas
├── services/          # Core service implementations
├── tools/             # Utility tools and helpers
├── types/             # TypeScript type definitions
├── utils/             # General utility functions
└── workflows/         # Complex business logic workflows
```

### `/docs`

Project documentation, including:

- Architecture guides
- Setup instructions
- API documentation
- Development guidelines

### `/scripts`

Utility scripts for:

- Development tasks
- Deployment automation
- Database management
- Testing helpers

### `/test-utils` and `/__tests__`

Test-related files:

- `test-utils/`: Testing utilities, helpers, and mock data
- `__tests__/`: Actual test files and test suites

### `/docker`

Docker-related configuration:

- Dockerfile(s)
- Docker Compose files
- Container configuration

## Configuration Files

- `auth.ts`: Authentication configuration
- `middleware.ts`: Next.js middleware
- `next.config.js`: Next.js configuration
- `tailwind.config.ts`: Tailwind CSS configuration
- `.env.local`: Environment variables (not tracked in git)
- `tsconfig.json`: TypeScript configuration
- `.eslintrc.json`: ESLint configuration
- `.prettierrc`: Prettier configuration

## Special Files

- `package.json`: Project dependencies and scripts
- `pnpm-lock.yaml`: Package lock file (using pnpm)
- `components.json`: Shadcn/ui components configuration

## Best Practices

1. **Component Organization**

   - Keep components focused and single-responsibility
   - Use appropriate subdirectories for related components
   - Keep simple, single-use logic inline within components
   - Create shared utilities only for truly reusable logic
   - Avoid premature abstraction
   - Use Tailwind's utility classes for consistent spacing
   - Minimize wrapper div nesting for simpler component structure

2. **Library Structure**

   - Keep business logic in `/lib`
   - Separate concerns into appropriate subdirectories
   - Use clear, descriptive names for files and directories
   - Create shared functions only when they provide clear value
   - Prioritize code clarity over excessive modularization

3. **Testing**

   - Place tests close to the code they test
   - Use `test-utils` for shared testing utilities
   - Follow the testing patterns established in `__tests__`
   - Test complex logic thoroughly
   - Keep test structure simple for straightforward code

4. **Documentation**
   - Keep documentation up-to-date in `/docs`
   - Document complex workflows and architecture decisions
   - Include examples where appropriate
   - Document the reasoning behind architectural decisions
   - Update documentation when implementation patterns change
