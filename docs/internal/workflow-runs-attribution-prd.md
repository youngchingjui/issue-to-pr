# Workflow Runs Attribution PRD

This PRD defines how we will persist and use initiator attribution and related identity context for workflow runs. It supports the Visibility Policy PRD by enabling the "initiated by me" rule and prepares for future tenancy and filtering.

## Problem

Today, we do not persist who initiated a workflow run. As a result:

- We cannot reliably filter by "runs I started".
- Webhook-triggered runs have no actor attribution.
- Authorization for details/logs is inconsistently enforced.

## Goals

- Persist initiator attribution for all newly created workflow runs.
- Make it possible to filter runs by initiator and/or repository.
- Enforce a consistent authorization rule across list, details, and logs: allow if requester is the initiator OR the owner of the repository.
- Keep the data model minimal and future-proof for tenancy and filtering.

## Non-goals

- Workspace/tenancy feature (membership, roles)
- Historical backfill for existing runs
- UX filters and dropdowns (can come later once data exists)

## Requirements

### Product behavior

- No UX change required beyond enabling the policy defined in the Visibility Policy PRD.
- New runs created from the app UI should immediately appear for the initiator.
- Webhook-triggered runs should appear for the actor when the actor maps to an Issue to PR user; otherwise, repo ownership rule applies.

### Attribution and context to persist (minimum)

Persist at run creation time (immutable IDs only where applicable):

- run_id (internal UUID)
- created_at
- trigger_type: "app_ui" | "webhook_label_issue" | "webhook_label_pr" | "webhook_unknown"
- repository: repo_id (GitHub numeric), repo_full_name
- installation_id (GitHub App installation)
- initiator: one of
  - initiator_user_id (Issue to PR user id), and/or
  - initiator_github_user_id (numeric) with initiator_github_login

Best-effort (optional, when available):

- issue_number / pr_number
- head_sha / head_branch
- webhook delivery metadata (delivery_id, type)

### Neo4j modeling (suggested)

Nodes

- (:WorkflowRun {id, created_at, status, trigger_type, ...})
- (:Repository {id, full_name, provider: "github"})
- (:Installation {id})
- (:User {id}) // Issue to PR application user
- (:GithubUser {id, login}) // GitHub identity; linked to User when available
- (:GithubWebhookEvent {id, delivery_id, type, created_at})

Relationships

- (wr)-[:ON_REPO]->(repo)
- (wr)-[:UNDER_INSTALLATION]->(inst)
- (wr)-[:INITIATED_BY]->(user)
- (wr)-[:INITIATED_BY]->(event:GithubWebhookEvent)
- (event)-[:SENDER]->(ghUser)
- (user)-[:LINKED_GITHUB_USER]->(ghUser)

Persistence policy

- MERGE nodes by stable identifiers
- Only persist immutable identifiers; fetch mutable presentation data (e.g., titles) from GitHub on read

## Architecture and Ports

Define shared ports and types (source of truth in `shared/`):

Types (business-level)

- shared/src/lib/types/index.ts — WorkflowRun, Repository, User, GithubUser, etc.
- shared/src/lib/types/db/neo4j.ts — Neo4j DTOs (separate from business types)

Ports

- shared/src/ports/db/index.ts
  - interface WorkflowRunContext { runId: string; repoId?: string; installationId?: string }
  - interface WorkflowRunHandle { ctx: WorkflowRunContext; append(event: WorkflowEventInput): Promise<void> }
  - interface DatabaseStorage { workflow: { run: { create(input: CreateWorkflowRunInput): Promise<WorkflowRunHandle>; }; }; }
  - type CreateWorkflowRunInput = { id: string; type: string; issueNumber?: number; repoFullName?: string; postToGithub?: boolean; initiatorUserId?: string; initiatorGithubUserId?: string; initiatorGithubLogin?: string; triggerType?: "app_ui" | "webhook_label_issue" | "webhook_label_pr" | "webhook_unknown"; installationId?: string; }
  - type WorkflowEventInput = { type: string; payload: unknown; createdAt?: string }

Adapters

- shared/src/adapters/neo4j/StorageAdapter.ts implements DatabaseStorage and MERGEs nodes/relationships as described above

Listing

- Introduce a WorkflowRunsRepository list API in shared:
  - { by: 'initiator', user: User }
  - { by: 'repository', repo: Repository }
  - { by: 'issue', issue: { repoFullName: string; issueNumber: number } }
- Return WorkflowRun[] with latest state and related entities (when needed)

## Authorization

Apply a consistent rule in app/API surfaces:

- Allow list/details/logs access if the requester is the initiator OR owns the repository the run executed on.
- Trust boundaries: verify GitHub webhook signatures; prefer mapping by stable numeric GitHub user id.

## Implementation Plan (high level)

Phase 1 — Persist attribution for new runs

- Add DatabaseStorage port with run.create and run.append
- Implement Neo4j adapter MERGE logic and relationships
- Wire run.create into worker/run initialization paths (app UI and webhook)

Phase 2 — Read/list with shared repository

- Add shared listing port with discriminated-union filters
- Update API routes and server components to use shared list and apply authorization consistently

Phase 3 — Cleanups and follow-ups

- Remove ad-hoc repo filtering in app pages/APIs
- Add basic unit/integration tests for attribution and visibility rules

## Acceptance Criteria

- New workflow runs persist initiator attribution and repo/installation context.
- Listing by initiator works reliably for runs created after this change.
- Webhook-triggered runs attribute the sender to a GithubUser and, when possible, to an Issue to PR User.
- App/API enforce the initiator-or-owner rule consistently for list, details, and logs.

## Risks and Mitigations

- Identity mapping gaps (webhook actors not linked to app users)
  - Mitigation: fall back to repo-owner visibility; store GithubUser id/login for future linking
- Over-persisting mutable data
  - Mitigation: store only immutable identifiers; derive presentation at read time
- Backward compatibility with existing consumers
  - Mitigation: additive changes; maintain existing shapes where possible; keep MERGE semantics

## References

- Visibility policy (scope-only): ./PRD.md
