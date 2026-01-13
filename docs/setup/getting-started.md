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

1. Create `.env.local` file. We manage our NextJS secrets on the Vercel platform.

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

2. Start development server:

```bash
pnpm dev
```

3. Open application:

- Navigate to [http://localhost:3000](http://localhost:3000)
- Sign in with GitHub
- Start using the application

## Next Steps

- [Authentication Setup](../guides/authentication.md)
- [AI Integration](../guides/ai-integration.md)
- [Architecture Overview](../guides/architecture.md)
