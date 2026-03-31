# Agent Capabilities and Controls

> This doc describes the **ideal state** of the feature. It may not reflect the current implementation.

## What the agent can do

When resolving a GitHub issue, the agent can:

- Read, edit, and create files in the repository
- Search through code to understand the codebase
- Run shell commands — installing dependencies, running tests, linting code
- Search the web for documentation and references
- Create a new branch for its changes
- Push code to that branch
- Open a pull request that links back to the original issue

## What the agent won't do

By default, the agent has guardrails to keep things safe:

- It never pushes directly to the `main` branch. All changes go to a separate branch so you can review them before merging.
- It does not upload your code or data to any external service beyond what is needed to run the AI model.
- It does not delete branches or repositories.
- It does not modify repository settings or permissions.

## User controls

This area is still being designed. In the future, users may be able to:

- Configure policies for what the agent is allowed to do on a per-repository basis (for example, allowing direct pushes to `main` for certain repos)
- Approve or reject specific actions during a live run

See [Sessions](sessions.md) for more on live, interactive workflow runs.

## Capabilities are the same regardless of model

The agent has the same set of tools whether it is powered by OpenAI or Anthropic. The end result is always code changes on a branch, with an optional pull request.

Different models may produce different coding styles or approaches, but they all have access to the same capabilities.

See [Choosing an AI Model](multi-model-support.md) for more on model selection.
