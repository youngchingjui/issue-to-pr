# Explore why we can't just use alpine, ubuntu might be heavier
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

# Clean up APT cache to keep the image small
RUN rm -rf /var/lib/apt/lists/*

# Verify installations
RUN rg --version && git --version

# Set working directory
WORKDIR /workspace

# Default command
CMD ["/bin/bash"] 