# Explore why we can't just use alpine, ubuntu might be heavier
FROM ubuntu:22.04

# Avoid interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Update package list
RUN apt-get update

# Install ripgrep
RUN apt-get install -y \
    ripgrep \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install tree and clean up APT cache to keep the image small
RUN apt-get install -y --no-install-recommends tree && \
    rm -rf /var/lib/apt/lists/*

# Verify installations
RUN rg --version && git --version

# Set working directory
WORKDIR /workspace

# Default command
CMD ["/bin/bash"] 