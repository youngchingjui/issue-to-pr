# Resolve Issue Workflow

---
**This document explains the architecture and inner workings of the "Resolve Issue" workflow implemented in this codebase.**
---

## Overview

The "Resolve Issue" workflow powers the end-to-end automated solution of GitHub issues using coordinated AI agents. Unlike a single-call LLM, it combines a persistent, containerized workspace, explicit multi-agent roles, strict tool use, and robust error handling to make transparent, auditable code changes—from analysis through PR creation.

### Core Flow

1. **Preparation & Environment Setup**
2. **Context Gathering**
3. **Agent Coordination (Planning & Implementation)**
4. **Code Change, Testing, Linting**
5. **Pull Request Creation (if authorized)**
6. **Status Tracking, Error Handling, and Logging**

---

## 1. Environment and Infrastructure

### Containerization

- Each run executes inside a dedicated Docker container (image: `ghcr.io/youngchingjui/agent-base`).
- The image provides:
  - Code search: `ripgrep`
  - Full git client, configured identity as `Issue To PR Agent`
  - Unix tools (curl, etc.)
- The agent workspace is the mounted, synchronized repo for full persistent file access.
- User or repo-configured setup commands (dependency install, environment prep) are run pre-agent.

**References:**
- [`lib/workflows/resolveIssue.ts`](lib/workflows/resolveIssue.ts)
- [`docker/README.md`](docker/README.md)
- [`lib/utils/container.ts`](lib/utils/container.ts), [`scripts/build-agent-image.sh`](scripts/build-agent-image.sh)

### State & Event Persistence

- Workflow events are persisted in a Neo4j database and enable real-time UI monitoring.
- All agent tool actions and thought steps are streamed, traced (Langfuse), and stored for review and replay.

---

## 2. The Agent and Its Instructions

### Agent Types and Their Roles

Agents are orchestrated for specialized tasks:

| Agent Type         | Role                                                                  |
| ------------------ | --------------------------------------------------------------------- |
| **CoordinatorAgent** | (Planned) Oversees, delegates, ensures completion/process integrity   |
| **ThinkerAgent**     | Analyzes issue, delivers stepwise implementation plan                |
| **CoderAgent**       | Implements plan, persists through all code changes and verification  |
| **ReviewerAgent**    | Reviews, plans, and validates PR outcomes                            |
| **Alignment/Goal Agents** | Run specialized checks/refinements                             |

#### The CoderAgent

- Main implementor for "resolve issue":
  - Analyzes the implementation plan/codebase in depth
  - **Persistence:** Must keep going and handle all errors—cannot stop partway or skip work
  - **Tool Use:** Only allowed to use explicit, safe tools for code reading/editing/search—*never guesses file structure*
  - **Verification:** Runs checks/lints/tests using CLI tools after each meaningful change
  - **Documentation:** Records all decisions, actions, and errors with reasoning
  - **Error Handling:** Must log, analyze, and resolve errors before proceeding
  - **Completion:** Finalizes with PR creation if possible—must not declare done until PR is opened

*Examples of actual system prompt/walkthroughs:*
- [`lib/agents/coder.ts`](lib/agents/coder.ts)
- [`__tests__/mocks/messages*.json`](__tests__/mocks/)

#### The CoordinatorAgent

- Not currently primary for this workflow, but in architecture for full orchestration/sequence validation (see `/lib/agents/coordinator.ts`).

---

## 3. Agent Tooling (LLM Tool API Layer)

Agents never read or mutate codebase state directly—they must call type-checked, strictly validated tools:

| Tool                  | What It Does                      | Access Mode                |
| --------------------- | --------------------------------- | -------------------------- |
| `GetFileContentTool`  | Reads file contents               | Container filesystem       |
| `RipgrepSearchTool`   | Searches code (ripgrep)           | Container filesystem       |
| `WriteFileContentTool`| Creates/edits file                | Container filesystem       |
| `BranchTool`          | Manages git branches              | Container, runs git        |
| `CommitTool`          | Creates git commit                | Container, runs git        |
| `FileCheckTool`       | Runs lint/tests/build             | Container, shell CLI       |
| --- Optional for PR ---|                                   |                            |
| `SyncBranchTool`      | Push branch to remote             | Container, uses GitHub API |
| `CreatePRTool`        | Opens PR on GitHub                | Uses GitHub API            |

*Tools are added to the CoderAgent as per execution context/permissions. See:*
- [`lib/tools/README.md`](lib/tools/README.md)

---

## 4. Workflow Step-by-Step

### Step 1: Setup & Initialization
- Check repo/user permissions (for branch push, PR)
- Pull/sync repo, mount in container
- Execute any setup commands requested (dependency install etc)

### Step 2: Gather Context
- Provide codebase tree to agent
- Fetch full issue, comments, plan (by ID, if specific)
- Initialize Langfuse trace for stepwise audit

### Step 3: Agent Problem Solving
- CoderAgent is seeded with:
  - Implementation plan
  - Issue text + all comments
  - Codebase tree
- **Session is persistent and iterative**: agent reads/searches, writes files, commits, lints/tests, reflects, iterates. No step is skipped until success.
- **Verification:** After significant code changes, agent runs `FileCheckTool` to catch and explicitly fix errors.
- **Atomicity:** Files always read before written, and changes are grouped/verified as atomic logical steps.

### Step 4: PR Submission (if authorized)
- Branch is pushed and PR opened via GitHub API tool if and only if code changes are correct and agent has permission.
- If not, steps and changes are still logged in workflow run/events for review.

### Step 5: Status & Event Audit
- All statuses (start, progress, errors, done) are emitted to Neo4j for UI/workflow run tracking.
- Agent thoughts, tool calls, artifacts (diffs, commit summaries) and all logs are available for end-user transparency.

---

## 5. Typical Execution: Example (Pseudocode)

```typescript
// See actual implementation in lib/workflows/resolveIssue.ts
resolveIssue({ issue, repository, jobId, apiKey, createPR, planId }) {
  // 1. Check perm/sync repo
  // 2. Containerize, configure workspace
  // 3. Register all required agent tools
  // 4. Fetch context (issue, plan, comments)
  // 5. Seed agent (CoderAgent) with plan/context
  // 6. Iterate: search/read, edit, test, commit using tool APIs only
  // 7. Lint/test after changes with FileCheckTool
  // 8. Push branch & create PR (if allowed/wanted)
  // 9. Emit statuses at all steps
  // 10. Tear down, log/tracing persists
}
```

---

## 6. Guarantees: Persistence, Transparency, Audit
- **Persistence:** Agent cannot end mid-way—must fix all errors, verify each step before moving on
- **Direct Codebase Evidence:** Agents can *never* guess files—must use search/read tools for all investigation
- **Full action/thought logs:** All agent steps, decisions, errors, diffs are logged and visible via the workflow run system
- **Every change is auditable from initial prompt to PR**

---

## 7. Test & Debug Facilities
- All agent LLM logic/test fixtures are in [`__tests__/lib/agents/resolveIssue.llm.test.ts`](./__tests__/lib/agents/resolveIssue.llm.test.ts).
- Run
  ```
  pnpm test:agent
  ```
  to validate logic with FAKE or real OpenAI key (agent will mimic real instructions—"persist until PR created; verify every change;").

---

## 8. References and Further Reading

- [`lib/workflows/resolveIssue.ts`](lib/workflows/resolveIssue.ts)
- [`lib/agents/`](lib/agents/) (agent logic, prompts)
- [`lib/tools/`](lib/tools/) (tools/interfaces)
- [`lib/tools/README.md`](lib/tools/README.md)
- [`internal-docs/issue-to-pr/user-stories.md`](internal-docs/issue-to-pr/user-stories.md)
- [`blogs/whyIssueToPR.md`](blogs/whyIssueToPR.md)
- [`components/landing-page/Features.tsx`](components/landing-page/Features.tsx)
- [`docs/guides/ai-integration.md`](docs/guides/ai-integration.md)
- UI: See workflow runs visualization and trace system

---

## 9. Example Workflow Log (Paraphrased)

```
[Status] Starting workflow for issue #23
[Status] Setting up containerized environment
[Agent] Loaded plan: "Add introduction section..."
[Agent] Codebase tree loaded
[Agent] Analyzing required files (calls search tools)
[Agent] Reads app/page.tsx, scans for insertion point
[Agent] Creates new component file: IntroductionSection.tsx
[Agent] Edits page.tsx to add import and render
[Agent] Runs FileCheckTool for lint and build
[Agent] Result: No errors
[Agent] Creates git commit, branch, PR (if allowed)
[Status] PR created: https://github.com/org/repo/pull/88
[Done] All changes are complete! Ready for review.
```
*See `__tests__/mocks/messages*.json` for detailed agent logs.*

---

## 10. Summary

The resolve issue workflow is a robust, auditable, and transparent AI-powered modification system—using persistent environments, multi-step agent prompts, strict tool gating, error handling, and replayable logs—for reliable codebase changes that are always reviewable and explainable.

---

*If you wish to extend, integrate, or inspect further, see source files and links above. Questions about agents/tooling should reference the TypeScript/interfaces named.*
