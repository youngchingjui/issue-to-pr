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

# Verify toolchain versions for transparency (for cache/debugging)
# Now includes: Python, pip, and Poetry checks
RUN rg --version \
 && git --version \
 && node --version \
 && npm --version \
 && pnpm --version \
 && python3 --version \
 && pip3 --version \
 && poetry --version

# --- AGENT BASE CUSTOMIZATION ---
# NOTE: This project requires pnpm for all Node.js package management!
# Running npm install is NOT SUPPORTED and will fail on many repositories.
# See /workspace/README.md for more info.

# Ensure workspace is owned by node user (prevents Git dubious ownership errors)
RUN chown -R node:node /workspace

# Optionally, configure git to trust the workspace, as user and for volume mounts.
RUN git config --global --add safe.directory /workspace

# Set working directory where the agent will later receive a repository to work on
WORKDIR /workspace

# Switch to the non-root "node" user for best security & correct file permissions
USER node

# Default command keeps the container alive for interactive use
CMD ["/bin/bash"]

