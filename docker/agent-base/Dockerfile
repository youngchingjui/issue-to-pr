# Lightweight base image with Node 22 and npm pre-installed (Debian "bookworm-slim")
FROM node:22-slim

# Avoid interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install useful CLI tools. Ripgrep, Git and tree come from Debian; curl is already present.
# Afterwards clean the package lists to keep the image small.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ripgrep \
        git \
        tree && \
    rm -rf /var/lib/apt/lists/*

# Enable Corepack (bundled with Node 22) and activate the latest stable pnpm version
RUN corepack enable && corepack prepare pnpm@latest --activate

# Verify toolchain versions for transparency
RUN rg --version && git --version && node --version && npm --version && pnpm --version

# Set working directory where the agent will later receive a repository to work on
WORKDIR /workspace

# Default command keeps the container alive for interactive use
CMD ["/bin/bash"]
