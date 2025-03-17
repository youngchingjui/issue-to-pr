# Issue To PR

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (version 14 or later)
- npm or yarn
- Redis server

### Setting Up Redis

1. **Install Redis**: Follow the instructions for your operating system to install Redis.

   - **macOS**: Use Homebrew

     ```bash
     brew update
     brew install redis
     ```

   - **Ubuntu**: Use the package manager

     ```bash
     sudo apt update
     sudo apt install redis-server
     ```

   - **Windows**: Use WSL or download a precompiled binary from [Microsoft's Redis page](https://github.com/microsoftarchive/redis/releases).

2. **Start Redis Server**: Run the Redis server with the default configuration.

   ```bash
   redis-server
   ```

3. **Test Redis**: Use the Redis CLI to ensure Redis is running.
   ```bash
   redis-cli
   ping
   ```
   You should receive a `PONG` response.

### Running the Development Server

1. **Clone the Repository**:

   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```

2. **Install Dependencies**:

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Run the Development Server**:

   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Open the Application**: Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Environment Variables

Ensure you have the necessary environment variables set up. You may need to create a `.env.local` file in the root of your project with the following variables:

```
AUTH_GITHUB_ID=your_github_client_id
AUTH_GITHUB_SECRET=your_github_client_secret
```

## Features

- Automatically creates pull requests from issues
- Uses AI to understand issue requirements and generate code
- Supports multiple programming languages and frameworks
- Configurable workflows and templates

## Development

### Prerequisites

- Node.js 18+
- pnpm
- GitHub App credentials

### Setup

1. Clone the repository
2. Install dependencies:

```bash
pnpm install
```

3. Copy `.env.example` to `.env.local` and fill in the required values
4. Start the development server:

```bash
pnpm dev
```

### Testing

The project includes a comprehensive testing infrastructure that allows you to test workflows without making real API calls.

#### Mock Services

You can enable mock services using environment variables:

```bash
# .env.local or .env.test
USE_MOCK_LLM=true    # Use mock LLM instead of real OpenAI API
USE_MOCK_GITHUB=true # Use mock GitHub client instead of real GitHub API
```

This allows you to:

- Test workflows without incurring OpenAI API costs
- Test GitHub operations without affecting real repositories
- Get faster feedback during development

See [test-utils/README.md](test-utils/README.md) for detailed documentation on using the testing infrastructure.

#### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT
