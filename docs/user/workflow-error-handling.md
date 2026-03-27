# Workflow Error Handling

General error handling principles, and other errors caught before or after workflow runs: [`docs/user/error-handling.md`](error-handling.md)

This doc covers how errors surface specifically in the context of workflow runs (e.g., "auto-resolve issue").

## Errors during workflow execution

Once a workflow run is in progress, errors are displayed in the **workflow timeline**.

### Configuration errors detected at runtime

If a configuration issue slips past pre-queue validation (e.g., API key revoked after the job was queued):

- Display the error in the workflow timeline
- Message includes what to fix (e.g., "Your OpenAI API key is invalid. Check your Settings.")

### Transient failures (after retries exhausted)

- Display the error in the workflow timeline
- Show a "Retry" button
- Message: "This may be a temporary issue. Try again?"

### Permanent failures

- Display the error in the workflow timeline
- Message: "Something went wrong. Our team has been notified."
- Link to check status or report additional context
