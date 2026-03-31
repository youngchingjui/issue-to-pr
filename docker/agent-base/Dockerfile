# Lightweight base image for containerized agent workflows
# Includes Node.js 22 (npm), pnpm, Python 3.11, Poetry, ripgrep, git, and tree
# OS: Debian "bookworm-slim"
FROM node:22-slim

# Avoid interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install CLI tooling: ripgrep, git, tree, Python 3.11, pip, and curl
# - Python 3.11 and pip3 are available directly in Debian Bookworm
# - curl is needed for Poetry installation
# - Clean package lists after installation to minimize image size
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ripgrep \
        git \
        tree \
        python3 \
        python3.11 \
        python3-pip \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Symlink python3 and pip3 to expected locations (just in case)
RUN ln -sf /usr/bin/python3.11 /usr/local/bin/python3 && \
    ln -sf /usr/bin/pip3 /usr/local/bin/pip3

# Install Poetry (recommended method)
# - Use install script; install under root so poetry is globally available
# - Symlink to /usr/local/bin for global access
RUN curl -sSL https://install.python-poetry.org | python3 - && \
    ln -sf /root/.local/bin/poetry /usr/local/bin/poetry

# Enable Corepack (bundled with Node 22) and activate latest stable pnpm version
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install Claude Agent SDK globally (pinned version for reproducible builds)
# Enables the in-container agent pattern described in docs/dev/claude-models.md
RUN npm install -g @anthropic-ai/claude-agent-sdk@0.2.87

# Verify toolchain versions for transparency (for cache/debugging)
RUN rg --version \
 && git --version \
 && node --version \
 && npm --version \
 && pnpm --version \
 && python3 --version \
 && pip3 --version \
 && poetry --version \
 && node -e "require('/usr/local/lib/node_modules/@anthropic-ai/claude-agent-sdk')"

# Set working directory where the agent will later receive a repository to work on
WORKDIR /workspace

# Default command keeps the container alive for interactive use
CMD ["/bin/bash"]
