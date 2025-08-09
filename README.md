# Issue To PR

## Compute & Server Requirements

This application performs complex codebase modifications and AI-powered workflows, which require the following infrastructure considerations:

- **Local file access:** Workflows need direct, persistent access to the entire codebase's file system.
- **Long-running processes:** Many operations (e.g., LLM agent analysis, recursive code modification) can take several minutes to complete.
- **Server/Container environment:** These processes must run on a persistent server or within a dedicated Docker container. In upcoming versions, each workflow may be isolated in its own Docker container for reliability and scalability.
- **Not serverless-compatible:** Serverless hosting platforms such as Vercel, Netlify, or AWS Lambda are **unsupported** and incompatible, due to their short execution timeouts and lack of persistent storage.

**Deployment guidance:**  
You must run this application on a VM, dedicated server, or persistent cloud instance with sufficient CPU, memory, and disk storage to support long-running AI workloads and file system access.

For more information about running with Docker, see [docker/README.md](./docker/README.md).

## Documentation

For detailed documentation, please visit:

// TODO: Actually we already have a architecture document. The code-architeure document then seems a bit duplicated.
// We should review both documents, identify what's still relevant (the architecture.md doc will be a bit outdated), and combine them to just `architectured.md`.

- [Getting Started Guide](docs/setup/getting-started.md)
- [System Architecture Overview](docs/guides/architecture.md)
- [Clean Architecture (Layers, Ports & Adapters)](docs/code-architecture.md)
- [Component Documentation](docs/components/README.md)

## Quick Start

### Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (version 24 or later)
- pnpm (preferred) - We use pnpm for its significant advantages:
  - Much faster installation than npm
  - Efficient disk space usage through content-addressable storage
  - Strict dependency management preventing phantom dependencies
  - Dramatically improved CI/CD build times
- docker

For detailed setup instructions, see our [Getting Started Guide](docs/setup/getting-started.md).

### Environment Variables

// TODO: Create a `.env.sample` file that maps to our latest env variables.
Create a `.env.local` file in the root of your project. See [Configuration Guide](docs/setup/getting-started.md#configuration) for all available options.

### Development Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features

- GitHub Authentication (Github App)
- Repository & Issue Management
- AI-Powered Code Generation
- Automated PR Creation
- Pull Request Review
- Context-based patch application via createApplyPatchTool ([docs/components/README.md#patch-format-and-createapplypatchtool](docs/components/README.md#patch-format-and-createapplypatchtool))

For detailed feature documentation, see our [User Guide](docs/guides/user-guide.md).

---

## Continuous Integration

Jest tests are now automatically run on every PR and push via GitHub Actions. PRs will show a 'Checks' status based on test results.

// TODO: Just put this whole testing section in table of contents and link to the document.

## Testing

The project includes several types of tests:

```bash
# Run all standard tests (unit + integration)
pnpm test

# Run only component tests
pnpm test:components

# Run only node tests
pnpm test:node

# Run agent/LLM tests (requires .env.local)
pnpm test:agent
```

For more detailed testing information, see [**tests**/README.md](./__tests__/README.md).

## Contributing

Please read our [Contributing Guide](docs/guides/contributing.md) for details on our code of conduct and development process.
