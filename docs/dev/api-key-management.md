# API Key Management — Technical Architecture

User-facing requirements: [`docs/user/api-key-management.md`](../user/api-key-management.md)

> This doc describes the **ideal architectural state** of the system. It may not reflect the current implementation.

## Storage

- Keys are stored per-user in the database, one field per provider.
- Keys are encrypted at rest.
- Keys are never returned to the client in plaintext — the settings page only receives a masked placeholder after saving.

## Validation

- **At save time**: A lightweight test call to the provider (e.g., list models) confirms the key is valid. Invalid keys are rejected immediately with a clear error.
- **At generation time**: If a key has expired, been revoked, or hit a quota limit since it was saved, the provider's error is mapped to a user-friendly message and surfaced.

## Retrieval

- Keys are retrieved server-side only — in workers (during workflow execution) and API routes.
- Keys are never logged, never sent to the client, and never included in event payloads.
- The key is injected into the agent runtime at execution time:
  - For external agent runtimes (e.g., OpenAI): passed directly to the SDK client in the worker process.
  - For in-container agent runtimes (e.g., Claude Agent SDK): set as an environment variable scoped to the container's lifetime.

## Demo / fallback keys

- A system-level demo key may exist for specific providers (currently OpenAI only) to allow users to try the product without their own key.
- Not all providers have demo keys.
- Demo keys are never exposed to users — they are used transparently when no user key is configured for the demo-eligible provider.

## Adding a new provider

Adding API key support for a new provider requires:

1. A new field in the user settings schema.
2. A new section in the Settings UI (following the existing pattern).
3. A verification endpoint that validates the key against the provider's API.
4. Updates to the key retrieval logic so the orchestrator can fetch the key for the new provider.
