# Workflow Runs PRD

## Problem

A user was surprised to see workflow runs they did not initiate on the Workflow Runs page. This likely happened because we showed runs from a public repo (e.g. youngchingjui/issue-to-pr).

This is a trust/expectation issue: users expect the page to reflect their activity unless explicitly told otherwise.

## Goal

Update workflow run listing behavior to be least surprising for users today, while laying groundwork for future tenancy/workspace visibility controls.

## Decision (v1)

Show workflow runs visible to the currently authenticated Issue to PR user when either condition is true:
• The run was initiated by the current user; or
• The run executed on a repository owned by the current user.

Additional notes:
• No “partial visibility” (no placeholders like “hidden runs exist”) in v1.
• Keep the implementation simple and compatible with future tenancy + filtering.

## Contradictions / ambiguities to resolve

• Identity mapping and trust for webhook actors (label-based triggers): how we link a GitHub webhook "actor" to an Issue to PR user account, and how we treat unmapped actors. See “Identity mapping and trust considerations (webhooks)” below.
• UI copy: should the page explicitly communicate repo-owner visibility (e.g., subtitle/tooltip “Includes runs on repositories you own”) vs just “My workflow runs”.
• Shared ports/adapters boundaries: confirm the exact locations/names in the shared folder for the event store and workflow-runs listing APIs.

## Non-goals (v1)

• Workspace / tenancy feature (Issue to PR-side membership management)
• Filters / dropdowns on the Workflow Runs page (e.g., “All accessible runs”, “Repo runs”, “Triggered by me”)
• Differentiated access for list vs details vs logs
• Full backfill of historical runs (existing runs may remain unattributed and may not appear)

## Context: how workflow runs are initiated

A workflow run can be initiated by:
• Issue to PR app UI: user clicks “Resolve issue”
• Issue to PR app UI: user launches from “Launch workflow” dropdown
• GitHub event/webhook: label added to issue/PR triggers webhook -> workers launch a run (actor may be a GitHub user or automation)

In v1, a user can see runs they initiated and runs executed on repositories they own.
We also want to show workflow runs that were initiated by the same user if they added a label to the issue or PR.
Also, we want to show workflow runs on a repository that is owned by the currently authenticated Issue to PR user.

## Current status (how workflow runs are retrieved today)

• Workflow Runs page (`app/workflow-runs/page.tsx`) loads all runs via `listWorkflowRuns()` and filters them by repositories returned from GitHub (`listUserRepositories`). This is a repo-access filter, not an initiator filter; public repos are included for any user.
• The Workflow Runs API (`app/api/workflow-runs/route.ts`) behaves similarly: `listWorkflowRuns()` returns all runs, then the API filters by `listUserRepositories` unless a specific repo/issue is requested (in that case it returns all runs for that issue without further filtering). Note: this API route is used by the `components/issues/IssueWorkflowRuns.tsx` client component via SWR.
• `listWorkflowRuns()` in `lib/neo4j/services/workflow.ts` calls `listAll()` or `listForIssue()` in `lib/neo4j/repositories/workflowRun.ts`. The underlying Neo4j query returns all `WorkflowRun` nodes and optionally joins the related `Issue` and latest `workflowState` event. There is no initiator/user filtering in the database layer.
• `initializeWorkflowRun()` in `lib/neo4j/services/workflow.ts` currently creates a `WorkflowRun` node with only `id`, `type`, `createdAt`, and `postToGithub`, plus an optional `Issue` link. There is no stored initiator attribution today.

## Requirements

### Product behavior

1. Workflow Runs page shows “My runs” where “My runs” = runs initiated by me OR runs on repositories I own.

### Data model / attribution (forward-looking, required for v1)

We need to begin storing run attribution on creation so future tenancy/filtering can be implemented cleanly.

For each new WorkflowRun, store at minimum:
• repo_id / repo_full_name
• installation_id (GitHub App installation)
• created_at
• status
• trigger_type (e.g. app_ui, webhook_label_issue, webhook_label_pr, etc.)
• github_username (Issue to PR user github username) — required for v1 listing

Best-effort (store when available, but not required for v1):
• trigger_actor_github_id (GitHub user/bot that caused the event)
• issue_number / pr_number
• head_sha / head_branch
• Any other run context needed for debugging/audit

### Neo4j modeling (suggested)

Nodes:
• (:WorkflowRun {id, created_at, status, trigger_type, ...})
• (:Repository {id, full_name, provider:"github"})
• (:Installation {id, github_installation_id})
• (:User {id}) (Issue to PR application user)
• (:GithubUser {id, login}) (GitHub identity; link to User when available)

Relationships:
• (wr)-[:ON_REPO]->(repo)
• (wr)-[:UNDER_INSTALLATION]->(inst)
• (wr)-[:INITIATED_BY_USER]->(user)          // present when an app user initiated the run
• (wr)-[:ACTOR_IS_GITHUB_USER]->(ghUser)     // webhook actor or UI actor’s mapped GitHub identity
• (user)-[:LINKED_GITHUB_USER]->(ghUser)     // mapping between app user and GitHub identity

Persistence policy:
• Only persist immutable identifiers (e.g., GitHub numeric IDs, installation ID). Do not persist mutable fields (e.g., titles, repoFullName changes) beyond what’s necessary for linking. Fetch mutable presentation data from GitHub as the source of truth.

## Code changes outline (no implementation)

### Shared ports/adapters and types

• Add or extend business-level types in the shared folder (source of truth):
  • `shared/src/lib/types/index.ts` (business types)
  • `shared/src/lib/types/db/neo4j.ts` (Neo4j-facing shapes), independently defined from business types.
• Create/extend a DatabaseStorage port (and Neo4j adapter) in `shared` responsible for persisting workflow runs and related nodes via MERGE:
  • On initialize/start: MERGE `WorkflowRun`, `User`, `GithubUser`, `Repository`, `Installation` nodes and relationships.
  • Persist only immutable identifiers from GitHub; derive presentation data at read-time from GitHub APIs.
  • Proposed shapes and locations:
    • `shared/src/ports/storage/index.ts`
      • `export interface WorkflowRunContext { runId: string; repoId?: string; installationId?: string }`
      • `export interface DatabaseStorage { workflow: { run: { create(input: CreateWorkflowRunInput): Promise<{ ctx: WorkflowRunContext }>; }; event: { append(ctx: WorkflowRunContext, event: WorkflowEventInput): Promise<void>; }; }; }`
      • `export type CreateWorkflowRunInput = { id: string; type: string; issueNumber?: number; repoFullName?: string; postToGithub?: boolean; initiatorUserId?: string; initiatorGithubUserId?: string; initiatorGithubLogin?: string; triggerType?: "app_ui" | "webhook_label_issue" | "webhook_label_pr" | "webhook_unknown"; installationId?: string; }`
      • `export type WorkflowEventInput = { type: string; payload: unknown; createdAt?: string }`
    • Neo4j adapter at `shared/src/adapters/neo4j/repositories/WorkflowStorageAdapter.ts` implements `DatabaseStorage` and MERGEs nodes/relationships.
• Create/extend a WorkflowRunsRepository/List port in `shared` with a discriminated-union filter:
  • `{ by: 'initiator', user: User }`
  • `{ by: 'repository', repo: Repository }`
  • `{ by: 'issue', issue: { repoFullName: string; issueNumber: number } }`
• Return type: `WorkflowRun[]` enriched with final run state and optionally related entities (issue?, initiatorUser?, initiatorGithubUser?, repository?, installation?).

### Run creation / attribution

• DatabaseStorage port (shared): add `workflow.run.create({...})` to accept attribution fields such as:
  • `id`, `type`, `issueNumber?`, `repoFullName?`, `postToGithub?`,
  • `initiatorUserId?`, `initiatorGithubUserId?`, `initiatorGithubLogin?`, `triggerType?`, `installationId?`.
• Neo4j adapter (shared): MERGE nodes and relationships on initialize; set properties on `WorkflowRun` for the new attribution fields.

### Run listing + authorization

• WorkflowRunsRepository (shared): implement `listWorkflowRuns(filter)` using the discriminated-union filters above.
• Authorization (applied consistently across list, details, logs): allow access if requester is the initiator OR the owner of the repository.
• App surfaces (Next.js pages and API routes) call the shared port and enforce the same authorization.

## Authorization policy (v1)

For now, authorization is intentionally simple:
• list / view_details / view_logs are allowed if the current user is the initiator of the run OR owns the repository the run executed on.

Note: We expect to evolve this into workspace + GitHub-permission based access later (separate PRD).

## UX / UI copy (v1)

• H1: “Workflow Runs”
• Subtitle (explicit scope): “Runs you started and runs on repositories you own.”
• Empty state copy:
• “No workflow runs visible to you yet.”

## Acceptance criteria

• Visiting Workflow Runs page shows runs initiated by the current user and runs on repositories the user owns; it does not show runs unrelated to the current user.
• Newly created runs launched from Issue to PR UI persist initiator attribution and appear for that user.
• Webhook-triggered runs appear when the actor maps to the current user (as initiator) or when the run’s repository is owned by the current user.
• Run detail/log endpoints enforce the same access (no ID-guessing leaks) based on initiator-or-owner rules.
• Implementation does not block future tenancy/filtering (fields captured; model extensible; shared ports defined).

## Identity mapping and trust considerations (webhooks)

• Source integrity: Verify GitHub webhook signatures (HMAC SHA-256 with shared secret) to prevent spoofed events.
• Actor identity: Use GitHub-provided actor fields (e.g., `sender.id`, `sender.login`) as the event actor. Prefer mapping by stable numeric GitHub user ID; store only immutable identifiers.
• App user mapping: Link the actor’s GitHub identity to an Issue to PR user account via next-auth/OAuth at sign-in time. If an actor has no mapping, treat the run as “unknown initiator” for user scope but still grant repo-owner visibility.
• Sensitivity: Workflow run details/logs are medium sensitivity. With verified webhooks and initiator-or-owner policy, exposure risk is limited to principals who either caused the run or own the code repository.
• Bots/automation: If the actor is a bot or GitHub App, do not attribute as a human initiator; rely on repo-owner visibility to surface relevant runs.

## Future work (explicitly deferred)

• Introduce Issue to PR workspace/tenancy with membership & roles.
• Add filters:
• “My runs”
• “Runs triggered by me”
• “All accessible runs”
• “Runs for repo X”
• Separate sensitivity levels:
• list/details broadly visible
• logs gated by stronger permissions
• Consider optional backfill strategies if we later want to increase historical visibility.

## Unresolved

• Confirm final UI wording for union-based visibility (keep subtitle wording vs alternative label).
• Confirm shared ports/adapters file layout/names in `shared` to standardize usage across apps.
• Finalize exact discriminated-union shapes and returned `WorkflowRun` enrichment (issue?, initiatorUser?, initiatorGithubUser?, repository?, installation?).

