# Mocks for Agent Testing

This directory contains static message thread fixtures for use with TestAgent and manual LLM-in-the-loop tests.

## How to add a new fixture

- Export a message thread from the database (see scripts/export-messages.ts).
- Save as a JSON file here (e.g., `messages1.json`).
- Reference the workflowRun ID for traceability.

## Message Fixture Index

| File           | workflowRunId                        | Description                                           |
| -------------- | ------------------------------------ | ----------------------------------------------------- |
| messages1.json | 75bc337f-0f87-4cb2-b16d-88e471951cda | Error: write_file introduced improper HTML characters |
| messages2.json | c9680923-ebc4-4e78-8165-f25d0c7e3c65 | Error: Quota error                                    |
| messages3.json | e5926e2f-acda-4504-8b1c-2493281b426b | Error: Typescript error                               |
| messages4.json | aea433aa-3bd7-4bf9-ab41-c9fe4c85d387 | Error: Typescript error (cannot use 'any' type)       |
| messages5.json | 449bd432-988b-428c-9282-e7d50590fa64 | Error: Prettier, Typescript                           |
| messages6.json |                                      | Test prompt                                           |
