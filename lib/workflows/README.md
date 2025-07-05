# Workflows Debugging Guide

This document lists example CLI commands that roughly mirror what the `resolveIssue` workflow does behind the scenes. The workflow sets up a temporary git worktree and executes commands from within a Docker container. These steps allow you to manually walk through the workflow for debugging or testing purposes.

## Example Steps

```bash
# 1. Clone the repository
git clone <repo-url>
cd issue-to-pr

# 2. Create a worktree for the issue branch
mkdir -p ../worktrees
git worktree add ../worktrees/issue-<number> main
cd ../worktrees/issue-<number>

# 3. Launch a container with the worktree mounted
docker run -d --name issue-<number> \
  -v $(pwd):/workspace \
  -w /workspace \
  ghcr.io/youngchingjui/agent-base \
  tail -f /dev/null

# 4. Install dependencies inside the container
docker exec issue-<number> pnpm install

# 5. Read a file
docker exec issue-<number> cat lib/workflows/resolveIssue.ts

# 6. Edit or create a file
$EDITOR path/to/your/file.ts

# 7. Run lint and tests inside the container
docker exec issue-<number> pnpm lint
docker exec issue-<number> pnpm test

# 8. Commit your changes (inside the container)
docker exec issue-<number> git add path/to/your/file.ts
docker exec issue-<number> git commit -m "feat: implement fix for issue <number>"

# 9. Push the branch from inside the container
docker exec issue-<number> git push origin HEAD:refs/heads/issue-<number>

# 10. Create a pull request from inside the container
docker exec issue-<number> gh pr create --fill

# 11. Clean up
docker rm -f issue-<number>
cd ..
git worktree remove issue-<number>
```

These steps show how a human developer can replicate the container-based `resolveIssue` workflow using common command line tools.
