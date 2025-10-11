GitHub Actions: Worker Image Build

This repository contains a workflow to build and push the apps/workers/workflow-workers Docker image to the GitHub Container Registry (GHCR).

Triggers

- push to main: builds and pushes the image automatically.
- workflow_dispatch: you can run the workflow manually on any branch from the Actions tab.

Image name and tags

- Registry: ghcr.io
- Image: ghcr.io/<owner>/workflow-workers
- Tags applied on each run:
  - Short commit SHA
  - latest
  - A UTC timestamp in the format YYYYMMDD-HHMMSS

Required credentials/permissions

- No additional secrets are required. The workflow logs in to GHCR using the built-in GITHUB_TOKEN.
- The workflow explicitly requests packages: write permission in the permissions block, which is required to push to GHCR.
- Ensure that GitHub Packages is enabled for your organization/repository and that the default GITHUB_TOKEN has permission to write packages. This is the default for most repositories.

Manual run instructions

1. Navigate to Actions in GitHub.
2. Select "Build and Push Worker Docker Image".
3. Click "Run workflow" and choose the branch you want to run against.

Local cleanup behavior

- To avoid impacting other Docker workloads on shared/self-hosted runners, the workflow does not perform a blanket docker system prune.
- Instead, it only prunes the Buildx cache for the builder instance created by the workflow. This keeps disk usage manageable without touching unrelated containers or images.

Notes

- The workflow builds with cache enabled (uses GitHub Actions cache for BuildKit) to speed up subsequent builds.
- Images are pushed to GHCR; the runner does not keep a local image copy unless load is explicitly used (we do not use load in this workflow).
