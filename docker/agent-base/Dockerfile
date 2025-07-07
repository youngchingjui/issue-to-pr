# Explore why we can'\''t just use alpine, ubuntu might be heavier
FROM ubuntu:22.04

# Avoid interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Update package list
RUN apt-get update

# Install ripgrep, git, curl, tree
RUN apt-get install -y \
    ripgrep \
    git \
    curl \
    tree

# Install Node.js v22.x (with npm) and PNPM
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g pnpm && \
    rm -rf /var/lib/apt/lists/*

# Verify installations
RUN rg --version && git --version && node --version && npm --version && pnpm --version

# Set working directory
WORKDIR /workspace

# Default command
CMD ["/bin/bash"]
