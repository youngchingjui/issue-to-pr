# Error Handling

When something goes wrong, the user should:

1. See what went wrong (without exposing sensitive details)
2. Have a clear next step

## Principles

- **Catch errors early.** If an error can be detected before work begins (e.g., from the user's settings or request), catch it there. Don't queue a job that will definitely fail.
- **Give instant feedback.** Pre-validation errors return an error response immediately. The user sees a toast notification without waiting for background processing.
- **Be actionable.** Every error message tells the user what to do next — not just what went wrong.
- **No silent failures.** If something fails, the user must know about it.
- **No unnecessary retries.** Don't ask users to retry errors that won't resolve by retrying.

## Error categories

### Configuration errors

Problems with the user's setup that require them to take action:

- Missing or invalid API key for the selected provider
- Selected provider not yet supported
- Quota or billing issues with a provider

**Behavior:** Caught during pre-validation when possible, returning an immediate error response (toast notification). If detected later during execution, surface the error with actionable guidance (e.g., "Check your Settings").

### Transient errors

Temporary failures that may resolve on their own:

- Network timeouts
- GitHub API rate limits or temporary outages
- Provider API temporary failures

**Behavior:** Automatic retry with backoff. User is informed that a retry is happening. If all retries fail, surface the error with a manual retry option.

### Permanent errors

Failures that require a fix from us:

- Internal bugs (e.g., code errors, missing files)
- Unexpected system state

**Behavior:** Stop immediately. Display a generic message ("Something went wrong. Our team has been notified."). No retry option.

## Pre-validation

The preferred place to catch configuration errors is **before any work begins** — before a background job is created or a workflow run is recorded.

This is better than failing later because:

- The user gets instant feedback.
- No dangling state is created in the database.

Pre-validation does not replace runtime checks. The execution layer should still handle potential errors.

## Feedback channels

Errors must reach the user regardless of how they triggered the action. The feedback channel depends on where the user is:

| Trigger | User context | Feedback channel |
|---|---|---|
| Web UI (button click) | User is on the web app | Toast notification (HTTP error response) |
| GitHub webhook (issue label, PR comment) | User is on GitHub | GitHub issue/PR comment |

## What we don't do

- Expose stack traces, tokens, or internal paths to users
- Leave users without a next action
- Silently fail
- Ask users to retry errors that won't resolve by retrying
- Silently fall back to an alternative (e.g., a different provider) when the user's selection fails
