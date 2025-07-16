# API Routes

This folder contains the serverless API endpoints used by the Next.js app.
Routes are organized by feature. Some workflows still live at the root level
(`comment`, `resolve`, etc.) but new workflow endpoints should be placed under
`/api/workflow/<workflow-name>`.

## Route Overview

- `/api/comment` – launch the `commentOnIssue` workflow.
- `/api/resolve` – launch the `resolveIssue` workflow.
- `/api/workflow/autoResolveIssue` – launch the `autoResolveIssue` workflow.
- `/api/workflow/alignment-check` – run pull request alignment checks.
- `/api/workflow/[workflowId]` – SSE stream and event publishing for a workflow.

Other feature specific endpoints can be found in subfolders such as `github`,
`openai`, and `playground`.

> **Note**: We plan to migrate existing workflow routes under `/api/workflow/<workflow-name>`
> to keep this directory organized.
