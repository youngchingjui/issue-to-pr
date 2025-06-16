# Mocks for Agent Testing

This directory contains static message thread fixtures for use with TestAgent and manual LLM-in-the-loop tests.

## How to add a new fixture

- Export a message thread from the database (see scripts/export-messages.ts).
- Save as a JSON file here (e.g., `messages1.json`).
- Reference the workflowRun ID for traceability.

## Notable workflowRun IDs

- `75bc337f-0f87-4cb2-b16d-88e471951cda` (production DB) — TODO: export and save as fixture.
