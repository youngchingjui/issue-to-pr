# Issue To PR

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

- GitHub Authentication (OAuth & App)
- Repository & Issue Management
- AI-Powered Code Generation
- Automated PR Creation
- Pull Request Review

For detailed feature documentation, see our [User Guide](docs/guides/user-guide.md).

---

## Setting your OpenAI API key

Some features require your own OpenAI API key. You can set it on the app's Settings page. This key is stored only in your browser, not on our servers. For instructions, go to **Settings → OpenAI API Key** after logging in.

---

## Continuous Integration

Jest tests are now automatically run on every PR and push via GitHub Actions. PRs will show a 'Checks' status based on test results.

## Contributing

Please read our [Contributing Guide](docs/guides/contributing.md) for details on our code of conduct and development process.
