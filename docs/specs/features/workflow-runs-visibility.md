# Workflow Runs Visibility

## User Perspective

### Problem

A user visited the Workflow Runs page and saw runs they didn't start. This happened because we showed runs from public repositories that anyone can see.

Users expect to see their own activity, not strangers' work.

### User Story

As a user, I want to see workflow runs that are relevant to me so I don't get confused by other people's activity.

### What Users Should See (v1)

Users see only workflow runs they started (initiated), sorted by start time (newest first).

### Page Copy

- Title: "Your workflow runs"
- Subtitle: "Workflow runs you have initiated."
- Empty state: "No workflow runs yet."
- Empty state CTA: "Resolve an issue" (link to the main page)

---

## Technical Implementation

### Current Behavior (Before)

- The Workflow Runs page loads all runs from the database
- It filters by repositories the user has access to via GitHub API
- Problem: public repos are included, so users see runs from repos they don't own

### New Behavior (After)

- Store who started each run when it's created
- Store which repository each run belongs to
- Filter runs by: initiator = current user
- Sort runs by start time descending (newest first)
- Apply the same filter to list view, detail view, and logs

### Data to Store on Run Creation

Required:

- Repository ID and full name
  - Note: repository full name is mutable; treat the numeric repository ID as the source of truth and update full name opportunistically (e.g., via repository/webhook events or when fresh data is fetched).
- Installation ID (GitHub App)
- Initiator attribution:
  - App user ID (Issue to PR user)
  - Linked GitHub user (numeric ID and login)
- Trigger type (app UI, webhook from label, etc.)

Optional (when available):

- GitHub user ID of the trigger actor
- Issue or PR number

### Authorization Rule

A user can view a run (list, details, logs) only if they are the initiator of the run.

### Webhooks

- Verify webhook signatures to prevent spoofing
- Extract the actor (sender) from the webhook payload (map by stable numeric GitHub user ID when available)
- App users authenticate via GitHub OAuth, so every app user has a linked GitHub identity. When a webhook actor corresponds to an app user, attribute the run to that user.
- If no corresponding app user exists yet for the webhook actor, persist the actor as a GitHub identity only; the run will not appear in any user's "My runs" list until that GitHub identity signs in and links to an app account.
- See also: docs/internal/github-webhook-workflows.md and docs/internal/workflow-authorization-spec.md

---

## Out of Scope (v1)

- Workspace/tenancy features
- Filters or dropdowns on the page
- Backfilling historical runs with attribution
- Different access levels for list vs details vs logs

