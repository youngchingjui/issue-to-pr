# Workflow Runs Visibility Policy (v1)

This PRD narrowly defines which workflow runs should be shown in the product today. It intentionally excludes attribution/data-model changes, which are tracked in a separate PRD (see References).

## Problem

Users were surprised to see workflow runs they did not initiate on the Workflow Runs page. This likely happened because we included runs from public repositories the user could see but did not own or start.

## Goal

Define a least-surprising, easy-to-understand visibility policy for the Workflow Runs list and detail views.

## Decision

In v1, show a workflow run to the currently authenticated Issue to PR user if ANY of the following is true:

- Initiated by the current user ("started by me"), or
- Executed on a repository owned by the current user ("runs on my repos")

Notes

- No “partial visibility” indicator (e.g., “some runs are hidden”) in v1.
- Keep copy explicit so users understand scope at a glance.
- This policy is stable even as we add workspaces/tenancy later.

## Non-goals (deferred to separate PRD)

- Initiator attribution data model and persistence
- Webhook actor identity mapping and storage
- Shared ports/adapters refactors to support attribution
- Filters (e.g., "All accessible runs", "Triggered by me")
- Workspace/tenancy membership and roles

## Product Requirements

- Update the Workflow Runs page heading/subtitle to reflect scope clearly.
  - H1: "Workflow Runs"
  - Subtitle: "Runs you started and runs on repositories you own."
- Empty state: "No workflow runs visible to you yet."
- Details view and logs follow the same visibility policy as the list.

Implementation note

- "Initiated by me" relies on storing initiator attribution at run creation time. Until attribution is implemented (see References), the UI may only be able to reliably enforce the repository-ownership rule. Messaging should still reflect the intended policy; engineering can ship initiator visibility once attribution is in place.

## Acceptance Criteria

- The product copy on the Workflow Runs list communicates the scope as defined above.
- The list, details, and logs are gated by the same visibility policy.
- Runs unrelated to the current user (neither started by them nor on their repos) do not appear.

## References

- Workflow Runs Attribution PRD: ./workflow-runs-attribution-prd.md
