# Workflow Runs Visibility

## User Perspective

### Problem

A user visited the Workflow Runs page and saw runs they didn't start. This happened because we showed runs from public repositories that anyone can see.

Users expect to see their own activity, not strangers' work.

### User Story

As a user, I want to see workflow runs that are relevant to me so I don't get confused by other people's activity.

### What Users Should See (v1)

A user sees a workflow run when either:
- They started the run, OR
- The run happened on a repository they own

### Page Copy

- Title: "Workflow Runs"
- Subtitle: "Runs you started and runs on repositories you own."
- Empty state: "No workflow runs visible to you yet."

---

## Technical Implementation

### Current Behavior (Before)

- The Workflow Runs page loads all runs from the database
- It filters by repositories the user has access to via GitHub API
- Problem: public repos are included, so users see runs from repos they don't own

### New Behavior (After)

- Store who started each run when it's created
- Store which repository each run belongs to
- Filter runs by: initiator = current user OR repository owner = current user
- Apply the same filter to list view, detail view, and logs

### Data to Store on Run Creation

Required:
- Repository ID and full name
- Installation ID (GitHub App)
- Who started the run (user ID and GitHub username)
- Trigger type (app UI, webhook from label, etc.)

Optional (when available):
- GitHub user ID of the trigger actor
- Issue or PR number

### Authorization Rule

A user can view a run (list, details, logs) if:
- They are the initiator of the run, OR
- They own the repository the run executed on

### Webhooks

- Verify webhook signatures to prevent spoofing
- Extract the actor (sender) from the webhook payload
- Link GitHub identity to the app user when possible
- If no user mapping exists, treat as "unknown initiator" but still show to repo owners

---

## Out of Scope (v1)

- Workspace/tenancy features
- Filters or dropdowns on the page
- Backfilling historical runs with attribution
- Different access levels for list vs details vs logs
