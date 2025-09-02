# Getting Started

## Table of Contents

- [Getting Started](#getting-started)
  - [Table of Contents](#table-of-contents)
  - [Prerequisites](#prerequisites)
    - [Redis Installation](#redis-installation)
      - [macOS](#macos)
      - [Ubuntu](#ubuntu)
      - [Windows](#windows)
  - [Installation](#installation)
  - [Configuration](#configuration)
  - [Development](#development)
  - [Next Steps](#next-steps)

## Prerequisites

Before you begin, ensure you have:

- Node.js (version 14 or later)
- pnpm (required)
- Redis server
- GitHub account
- OpenAI API key
- Docker (for containerized agent workflows)

Important: our workflows attach agent containers to a Docker bridge network named `preview`. Create it once on your machine:

```bash
docker network create preview
```

You can verify with:

```bash
docker network inspect preview
```

If you choose a different network name, update the application configuration and ensure that network exists before running workflows.

### Redis Installation

#### macOS

```bash
brew update
brew install redis
```

#### Ubuntu

```bash
sudo apt update
sudo apt install redis-server
```

#### Windows

Use WSL or download from [Microsoft's Redis](https://github.com/microsoftarchive/redis/releases)

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd <repository-directory>
```

2. Install pnpm (if not installed):

```bash
npm install -g pnpm
```

3. Install dependencies:

```bash
pnpm install
```

## Configuration

1. Create `.env.local` file:

```env
# GitHub App (optional)
GITHUB_APP_ID=your_app_id
GITHUB_APP_CLIENT_ID=your_app_client_id
GITHUB_APP_CLIENT_SECRET=your_app_client_secret
GITHUB_APP_PRIVATE_KEY=your_private_key

# Redis
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# OpenAI (optional for development)
OPENAI_API_KEY=your_openai_key
```

1. Configure GitHub App:

- Create new GitHub App
- Set permissions
- Generate private key
- Install app in your repositories

## Development

1. Start Redis server:

```bash
redis-server
```

2. Ensure the Docker `preview` network exists:

```bash
docker network create preview 2>/dev/null || true
```

3. Start development server:

```bash
pnpm dev
```

4. Open application:

- Navigate to [http://localhost:3000](http://localhost:3000)
- Sign in with GitHub
- Start using the application

## Next Steps

- [Authentication Setup](../guides/authentication.md)
- [AI Integration](../guides/ai-integration.md)
- [Architecture Overview](../guides/architecture.md)

