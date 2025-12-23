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

## Non-goals (v1)

• Workspace / tenancy feature (Issue to PR-side membership management)
• Filters / dropdowns on the Workflow Runs page (e.g., “All accessible runs”, “Repo runs”, “Triggered by me”)
• Differentiated access for list vs details vs logs
• Data migration to retroactively attribute old workflow runs (existing runs may remain unattributed and may not appear)

## Context: how workflow runs are initiated

A workflow run can be initiated by:
• Issue to PR app UI: user clicks “Resolve issue”
• Issue to PR app UI: user launches from “Launch workflow” dropdown
• GitHub event/webhook: label added to issue/PR triggers webhook -> workers launch a run (actor may be a GitHub user or automation)

In v1, we only show runs where the initiator is the current Issue to PR user.
We also want to show workflow runs that were initiated by the same user if they added a label to the issue or PR.
Also, we want to show workflow runs on a repository that is owned by the currently authenticated Issue to PR user.

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
