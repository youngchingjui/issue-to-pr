# Workflow Runs PRD

## Problem

A user was surprised to see workflow runs they did not initiate on the Workflow Runs page. This likely happened because we showed runs from a public repo (e.g. youngchingjui/issue-to-pr).

This is a trust/expectation issue: users expect the page to reflect their activity unless explicitly told otherwise.

## Goal

Update workflow run listing behavior to be least surprising for users today, while laying groundwork for future tenancy/workspace visibility controls.

## Decision (v1)

Show workflow runs initiated by the currently authenticated Issue to PR user.
• If a run was not initiated by the current app user, it should not appear in the list.
• All runs on a repository that is owned by the currently authenticated Issue to PR user should be shown.
• No “partial visibility” (no placeholders like “hidden runs exist”) in v1.
• We will keep the implementation simple and compatible with future tenancy + filtering.

## Contradictions / ambiguities to resolve

• “Show workflow runs initiated by the currently authenticated Issue to PR user” conflicts with “All runs on a repository that is owned by the currently authenticated Issue to PR user should be shown.” These imply different scopes (initiator-only vs repo-owner visibility).
• Authorization policy says list/details/logs are allowed only if the current user is the initiator of the run. That conflicts with showing all runs for repos the user owns (non-initiated runs would be visible).
• Requirements say “Workflow Runs page shows only ‘My runs’ (Definition of ‘My runs’ to be defined)” while Decision already defines behavior; this needs a single source of truth.
• Context says: “We also want to show workflow runs that were initiated by the same user if they added a label to the issue or PR.” That implies linking a GitHub label actor to the Issue to PR user account; the mapping and trust model are unspecified.
• Non-goals say “Data migration to retroactively attribute old workflow runs,” but the Unresolved section suggests a default rule for older runs (repo owner match). This needs a clear v1 stance (no backfill vs best-effort backfill).

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

In v1, we only show runs where the initiator is the current Issue to PR user.
We also want to show workflow runs that were initiated by the same user if they added a label to the issue or PR.
Also, we want to show workflow runs on a repository that is owned by the currently authenticated Issue to PR user.

## Current status (how workflow runs are retrieved today)

• Workflow Runs page (`app/workflow-runs/page.tsx`) loads all runs via `listWorkflowRuns()` and filters them by repositories returned from GitHub (`listUserRepositories`). This is a repo-access filter, not an initiator filter; public repos are included for any user.
• The Workflow Runs API (`app/api/workflow-runs/route.ts`) behaves similarly: `listWorkflowRuns()` returns all runs, then the API filters by `listUserRepositories` unless a specific repo/issue is requested (in that case it returns all runs for that issue without further filtering).
• `listWorkflowRuns()` in `lib/neo4j/services/workflow.ts` calls `listAll()` or `listForIssue()` in `lib/neo4j/repositories/workflowRun.ts`. The underlying Neo4j query returns all `WorkflowRun` nodes and optionally joins the related `Issue` and latest `workflowState` event. There is no initiator/user filtering in the database layer.
• `initializeWorkflowRun()` in `lib/neo4j/services/workflow.ts` currently creates a `WorkflowRun` node with only `id`, `type`, `createdAt`, and `postToGithub`, plus an optional `Issue` link. There is no stored initiator attribution today.

## Requirements

### Product behavior

1. Workflow Runs page shows only “My runs”
   (Definition of “My runs” to be defined)

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
• (:User {id, github_username, ...}) (Issue to PR user; GitHub mapping optional)

Relationships:
• (wr)-[:ON_REPO]->(repo)
• (wr)-[:UNDER_INSTALLATION]->(inst)
• (wr)-[:INITIATED_BY]->(user)

## Code changes outline (no implementation)

### Data model + schema shape

• `lib/types/index.ts`
  • Extend `workflowRunSchema` to include optional attribution fields:
    • `initiatorUserId?: string`
    • `initiatorGithubUsername?: string`
    • `triggerType?: "app_ui" | "webhook_label_issue" | "webhook_label_pr" | "webhook_unknown"`
    • `installationId?: string`
    • `repoFullName?: string` (if we want workflow-run records even without Issue linkage)
• `lib/types/db/neo4j.ts`
  • Mirror the additions in the Neo4j-layer `workflowRunSchema` so Neo4j models can parse the new fields.

### Run creation / attribution

• `lib/neo4j/services/workflow.ts`
  • Update `initializeWorkflowRun({ ... })` signature to accept attribution fields:
    ```ts
    export async function initializeWorkflowRun({
      id,
      type,
      issueNumber,
      repoFullName,
      postToGithub,
      initiatorUserId,
      initiatorGithubUsername,
      triggerType,
      installationId,
    }: {
      id: string
      type: WorkflowType
      issueNumber?: number
      repoFullName?: string
      postToGithub?: boolean
      initiatorUserId?: string
      initiatorGithubUsername?: string
      triggerType?: TriggerType
      installationId?: string
    }): Promise<{ issue?: AppIssue; run: AppWorkflowRun }>
    ```
  • Pass those fields to the repository layer when creating or merging a `WorkflowRun`.

• `lib/neo4j/repositories/workflowRun.ts`
  • Update `create(tx, workflowRun)` to include new properties in the `CREATE (w:WorkflowRun { ... })` map.
  • Update `mergeIssueLink(tx, { workflowRun, issue })` to set `workflowRun` properties when merging.

### Run listing + authorization

• `lib/neo4j/services/workflow.ts`
  • Add a user-scoped listing function (or extend `listWorkflowRuns`) to accept filters:
    ```ts
    export async function listWorkflowRuns({
      issue,
      initiatorUserId,
      repoOwnerGithubUsername,
    }: {
      issue?: { repoFullName: string; issueNumber: number }
      initiatorUserId?: string
      repoOwnerGithubUsername?: string
    }): Promise<(AppWorkflowRun & { state: WorkflowRunState; issue?: AppIssue })[]>
    ```
  • Apply v1 visibility rules consistently for list, detail, and log fetches.

• `lib/neo4j/repositories/workflowRun.ts`
  • Add a query to filter by `initiatorUserId` (and optionally by `repoOwnerGithubUsername` if we decide to honor the “repo owner sees all runs” rule).
  • If we keep “repo owner sees all runs,” define how to derive repo ownership from `repoFullName` and compare it to the current user’s GitHub username.

• `app/workflow-runs/page.tsx`
  • Replace the repo-access filter with initiator-based filtering (and any explicit repo-owner visibility logic).
  • Ensure UI copy changes to “My workflow runs.”

• `app/api/workflow-runs/route.ts`
  • Apply the same initiator/repo-owner filters used on the page.
  • Keep issue-specific requests consistent with v1 access rules.

• `app/workflow-runs/[traceId]/page.tsx`
  • Gate detail view (and related event/log endpoints) using the same initiator-based access check to prevent ID-guessing.

### Telemetry / reporting

• `lib/neo4j/services/workflow.ts` or a shared telemetry utility
  • Record a counter for runs missing `initiatorUserId` to quantify migration/backfill scope.

## Authorization policy (v1)

For now, authorization is intentionally simple:
• list / view_details / view_logs are allowed only if the current user is the initiator of the run.

Note: We expect to evolve this into workspace + GitHub-permission based access later (separate PRD).

## UX / UI copy (v1)

• Page title or prominent label should indicate scope clearly:
• “My workflow runs” (preferred)
• Empty state copy:
• “No workflow runs started by you yet.”

(We should avoid ambiguous wording like “Workflow Runs” without context.)

## Acceptance criteria

• Visiting Workflow Runs page does not show runs initiated by other users, GitHub actors, or public repo activity unrelated to the current user.
• Newly created runs launched from Issue to PR UI persist initiator_user_id and appear for that user.
• Webhook-triggered runs without initiator_user_id do not appear in the list (v1).
• Run detail/log endpoints enforce the same initiator-based access (no ID-guessing leaks).
• Implementation does not block future tenancy/filtering (fields captured; model extensible).

## Data migration (expanded)

### Scope / goals

• Avoid exposing historical runs with unknown ownership.
• Provide a path to improve historical visibility later without committing to a full backfill now.

### Options

1. **No migration (v1 default)**
   • Do nothing for existing WorkflowRun nodes.
   • Runs without `initiatorUserId` remain hidden in list/details/logs.
   • Add telemetry to quantify how many runs are invisible due to missing attribution.

2. **Best-effort backfill (limited, opt-in)**
   • For runs linked to an Issue, infer `repoFullName` owner (`owner/repo`) and compare `owner` to the current user’s GitHub username.
   • If the owner matches, set a `repoOwnerVisibility` flag (or populate `initiatorGithubUsername` with the owner) to allow the repo owner to see legacy runs.
   • This should be explicit and logged to avoid accidental over-sharing.

3. **Manual review queue (deferred)**
   • Create an admin-only report of missing-attribution runs to review and re-attribute selectively.

### Recommended v1 stance

• Choose option 1 by default, while keeping the schema extensible for option 2 later.
• If we decide to adopt option 2, document the exact criteria and add a one-time script (outside the app request path) to update legacy runs.

## Implementation notes / tasks

1. Add attribution at run creation
   • Ensure worker/service that creates WorkflowRun persists initiator_user_id when launched via app UI.
   • Persist trigger_type for all runs.
   • Persist repo + installation identifiers. 2. Update listing query
   • Filter workflow run listing by initiator_user_id == current_user_id. 3. Update run detail/log access checks
   • Deny access if requester is not initiator. 4. Telemetry (optional but helpful)
   • Log counts of runs excluded due to missing initiator_user_id (to quantify migration need later).

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
• Backfill/migrate old runs to include attribution where possible.

## Unresolved

- how do we handle previous runs that don't have attributions? - maybe let's review them manually and confirm. 1 default could be if the repo owner matches their github username. that should actually be a given as well - users should be able to see all runs for repos that exist under their own github account.
