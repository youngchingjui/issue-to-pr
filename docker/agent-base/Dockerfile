FROM ubuntu:22.04

# Avoid interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Update package list and install ripgrep
RUN apt-get update && \
    apt-get install -y \
    ripgrep \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Verify installations
RUN rg --version && git --version

# Set working directory
WORKDIR /workspace

# Default command
CMD ["/bin/bash"] 