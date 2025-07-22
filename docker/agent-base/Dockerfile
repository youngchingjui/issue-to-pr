# Lightweight base image for containerized agent workflows
# Includes Node.js 22 (npm), pnpm, Python 3.11, Poetry, ripgrep, git, tree, and GitHub CLI (gh)
# OS: Debian "bookworm-slim"
FROM node:22-slim

# Avoid interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# -----------------------------------------------------------------------------
# 1. Base tooling (ripgrep, git, Python, etc.)
# -----------------------------------------------------------------------------
# Install CLI tooling: ripgrep, git, tree, Python 3.11, pip, and curl
# - Python 3.11 and pip3 are available directly in Debian Bookworm
# - curl is needed for Poetry installation + GitHub CLI repository bootstrap
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

# -----------------------------------------------------------------------------
# 2. GitHub CLI (gh)
# -----------------------------------------------------------------------------
# Install GitHub CLI using the official Debian package repository. We add the
# signed APT source and install `gh` without any recommended extras to keep the
# image lightweight.
RUN set -euo pipefail && \
    # Add GitHub CLI apt repository
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg && \
    chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
      | tee /etc/apt/sources.list.d/github-cli.list > /dev/null && \
    apt-get update && \
    apt-get install -y --no-install-recommends gh && \
    rm -rf /var/lib/apt/lists/*

# -----------------------------------------------------------------------------
# 3. Python Poetry
# -----------------------------------------------------------------------------
# Symlink python3 and pip3 to expected locations (just in case)
RUN ln -sf /usr/bin/python3.11 /usr/local/bin/python3 && \
    ln -sf /usr/bin/pip3 /usr/local/bin/pip3

# Install Poetry (recommended method)
# - Use install script; install under root so poetry is globally available
# - Symlink to /usr/local/bin for global access
RUN curl -sSL https://install.python-poetry.org | python3 - && \
    ln -sf /root/.local/bin/poetry /usr/local/bin/poetry

# -----------------------------------------------------------------------------
# 4. Node.js package managers (pnpm)
# -----------------------------------------------------------------------------
# Enable Corepack (bundled with Node 22) and activate latest stable pnpm version
RUN corepack enable && corepack prepare pnpm@latest --activate

# -----------------------------------------------------------------------------
# 5. Verify toolchain versions for transparency (useful for caching/debugging)
# -----------------------------------------------------------------------------
RUN rg --version \
 && git --version \
 && node --version \
 && npm --version \
 && pnpm --version \
 && python3 --version \
 && pip3 --version \
 && poetry --version \
 && gh --version

# -----------------------------------------------------------------------------
# 6. Workspace defaults
# -----------------------------------------------------------------------------
# Set working directory where the agent will later receive a repository to work on
WORKDIR /workspace

# Default command keeps the container alive for interactive use
CMD ["/bin/bash"]

