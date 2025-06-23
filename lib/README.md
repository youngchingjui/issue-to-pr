# /lib

This directory is the **backend & domain layer** of the project. All code that models business logic, integrates with external services, or provides reusable utilities lives here so it can be shared by UI routes, API endpoints, or LLM agents alike.

High-level structure (non-exhaustive):

- `agents/` – Prompt wrappers around the core `Agent` class (coder, reviewer, thinker, etc.).
- `github/`, `neo4j/`, `redis.ts`, `langfuse.ts` – Service clients and data-access helpers.
- `workflows/` – Orchestrated flows that combine agents, tools, and services to achieve a higher-level goal (e.g. _resolveIssue_, _reviewPullRequest_).
- `tools/` – Thin wrappers that expose selected helper functions to LLMs as OpenAI Function-calling **tools**. See `lib/tools/README.md`.
- `utils/` – Generic utility functions that do **not** belong to any specific service (e.g. `setupEnv.ts`, string helpers, etc.).
- Root files (`fs.ts`, `git.ts`, `openai.ts`, …) – Stand-alone helpers with no external dependencies apart from Node or first-party libraries.

When deciding where to place new code ask yourself:

1. **Is it generic logic that many parts of the backend may want to reuse?** → put it in an existing or new sub-folder under `lib`.
2. **Is it a tiny function you want the LLM to call directly?** → create a tool wrapper in `lib/tools` and keep the underlying implementation in `lib`.

Keeping `lib` clean and dependency-free makes the project easier to test and reason about. No React, Next.js, or API route specifics should leak into this layer.
