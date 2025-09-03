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

### Required Docker Network

Agent workflows attach containers to a user-defined Docker bridge network named `preview`. If this network does not exist, container startup will fail. Create it once per host machine:

```bash
docker network create preview
```

On failure, the server logs will include guidance. The client will display a generic configuration error message asking you to check server logs.

## Documentation

For detailed documentation, please visit:

- [Getting Started Guide](docs/setup/getting-started.md)
- [Architecture Overview](docs/guides/architecture.md)
- [API Documentation](docs/api/README.md)
- [Component Documentation](docs/components/README.md)

## Quick Start

### Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (version 14 or later)
- pnpm (required) - We use pnpm for its significant advantages:
  - Much faster installation than npm
  - Efficient disk space usage through content-addressable storage
  - Strict dependency management preventing phantom dependencies
  - Dramatically improved CI/CD build times
- Redis server
- Docker (for containerized workflows) and the `preview` network (see above)

For detailed setup instructions, see our [Getting Started Guide](docs/setup/getting-started.md).

### Environment Variables

Create a `.env.local` file in the root of your project. See [Configuration Guide](docs/setup/getting-started.md#configuration) for all available options.

Basic configuration:

```env
AUTH_GITHUB_ID=your_github_client_id
AUTH_GITHUB_SECRET=your_github_client_secret
```

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

## Setting your OpenAI API key

Some features require your own OpenAI API key. You can set it on the app's Settings page. This key is stored only in your browser, not on our servers. For instructions, go to **Settings → OpenAI API Key** after logging in.

---

## Continuous Integration

Jest tests are now automatically run on every PR and push via GitHub Actions. PRs will show a 'Checks' status based on test results.

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

## Server Actions

We keep server functions alongside other helpers under `lib/`. Any file can become a server action simply by including the `"use server"` directive at the top. There is no separate `actions` directory—functions defined in `lib` can be imported directly in client components and invoked as server actions. Workflow buttons should call these helpers and handle their own loading state; since workflows are long‑running, they execute in the background without additional context providers.

