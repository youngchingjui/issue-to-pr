# Workflow Error Handling

When a workflow fails, the user should:

1. See what went wrong (without exposing sensitive details)
2. Have a clear next step

## Error Categories

### Transient errors

Temporary failures that may resolve on their own:

- Network timeouts
- GitHub API rate limits or temporary outages
- OpenAI API temporary failures

**Behavior:** Automatic retry (up to 3 attempts with backoff). User sees "Retrying..." in the timeline. No action needed from user unless all retries fail.

### Permanent errors

Failures that require a fix from us:

- Internal bugs (e.g., code errors, missing files)
- Configuration issues
- Unexpected system state

**Behavior:** Stop immediately. Show error in timeline. Display: "Something went wrong. Our team has been notified." No retry button (retrying won't help).

## User Experience

### On transient failure (after retries exhausted)

- Display the error in the workflow timeline
- Show a "Retry" button
- Message: "This may be a temporary issue. Try again?"

### On permanent failure

- Display the error in the workflow timeline
- Message: "Something went wrong. Our team has been notified."
- Link to check status or report additional context

## What we don't do

- Expose stack traces, tokens, or internal paths to users
- Leave users without a next action
- Silently fail
- Ask users to retry errors that won't resolve by retrying
