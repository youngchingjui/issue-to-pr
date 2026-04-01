# Branch Naming

When the agent resolves a GitHub issue, it creates a new branch to hold the changes. This document describes how that branch gets its name.

## How branch names are generated

The agent reads the issue title and description, then uses AI to suggest a short, descriptive name that reflects what the issue is about.

## The naming pattern

The name is formatted in kebab-case (words separated by hyphens).
Branch names may use a descriptive prefix based on the nature of the issue, such as `feature/`, `fix/`, or `chore/`, followed by a short slug. For example:

- `feature/add-dark-mode-toggle`
- `fix/login-redirect-loop`
- `chore/update-dependencies`

## Conflict handling

Before settling on a name, the agent checks whether a branch with that name already exists in the repository. If it does, a number is appended to make it unique:

- `feature/add-dark-mode-toggle` (taken)
- `feature/add-dark-mode-toggle-2` (used instead)

## Fallback behavior

If the AI is unable to generate a branch name -- for example, due to a temporary API error -- the agent falls back to `issue-{number}` (e.g., `issue-42`) and continues the workflow from there. The agent never commits directly to the repository's default branch.

## Custom naming rules (planned)

In a future release, users will be able to specify custom branch naming rules in natural language as a preference. For example, you could instruct the agent to always include a ticket number or use a specific prefix convention.

## Connection to preview URLs

Each workflow run gets a temporary preview environment. The URL for that environment is derived from the branch name, so two runs on different branches will have different preview URLs. This makes it possible to run multiple issues in parallel without them interfering with each other.
