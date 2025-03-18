# Issue To PR

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (version 14 or later)
- pnpm
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
   pnpm install
   ```

3. **Run the Development Server**:

   ```bash
   pnpm run dev
   ```

4. **Open the Application**: Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Environment Variables

Ensure you have the necessary environment variables set up. You may need to create a `.env.local` file in the root of your project with the following variables:

```
AUTH_GITHUB_ID=your_github_client_id
AUTH_GITHUB_SECRET=your_github_client_secret
```