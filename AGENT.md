# Agent

This file is meant for any agents to read to better understand the overall architecture and design choices in this codebase.

## LLM Lints

Here are a few rules or guidelines we'd like to enforce in this codebase.

- NextJS's server actions should be reserved for POST requests that mutate data. The usual pattern should generally be:
  - Call server action from a client component
  - Server action then composes the adapters needed to carry out the intended request
  - Server actions are considered a "data boundary" - so inputs and outputs should probably be defined by `zod` schemas, so they can be parsed both within the server action as well as any subscribers to the server action.
