# Getting Started

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Development](#development)

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

1. Create `.env.local` file:

```env
# GitHub OAuth
GITHUB_OAUTH_ID=your_oauth_client_id
GITHUB_OAUTH_SECRET=your_oauth_client_secret

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

# Required for secure user API key storage
# Must be a 32-byte base64 string. Generate using:
# node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
USER_SECRET_ENCRYPTION_KEY=your_base64_32byte_secret
```

2. Configure GitHub OAuth App:

- Go to GitHub Developer Settings
- Create new OAuth App
- Set callback URL to `http://localhost:3000/api/auth/callback/github-oauth`
- Copy Client ID and Secret to `.env.local`

3. (Optional) Configure GitHub App:

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
