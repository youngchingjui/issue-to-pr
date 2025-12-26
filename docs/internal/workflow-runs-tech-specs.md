# Tech Specs — Workflow Runs Visibility and Attribution

Source PRD: docs/internal/PRD.md

Scope: Define the shape of new/updated functions, types, and files required to implement v1 behavior for Workflow Runs listing, creation (with attribution), and consistent authorization across list/details/logs. No implementation details are provided here—only filenames, exported members, and their input/output shapes.

## New shared ports, adapters, and types

- File: shared/src/ports/db/index.ts
  - export type CreateWorkflowRunInput = {
    id: string;
    type: string; // workflow type
    issueNumber?: number;
    repoFullName?: string; // e.g. "owner/name"
    postToGithub?: boolean;
    initiatorUserId?: string; // Issue to PR user id
    initiatorGithubUserId?: string; // numeric GitHub user id
    initiatorGithubLogin?: string; // GitHub login handle
    triggerType?: "app_ui" | "webhook_label_issue" | "webhook_label_pr" | "webhook_unknown";
    installationId?: string; // GitHub App installation id
  };
  - export type WorkflowEventInput = {
    type: string; // event discriminator
    payload: unknown;
    createdAt?: string; // ISO timestamp (optional)
  };
  - export interface WorkflowRunContext {
    runId: string;
    repoId?: string;
    installationId?: string;
  }
  - export interface WorkflowRunHandle {
    ctx: WorkflowRunContext;
    append(event: WorkflowEventInput): Promise<void>;
  }
  - export type ListWorkflowRunsFilter =
    | { by: "initiator"; user: { id: string; githubUserId?: string; githubLogin?: string } }
    | { by: "repository"; repo: { id?: string; fullName: string } }
    | { by: "issue"; issue: { repoFullName: string; issueNumber: number } };
  - export type ListedWorkflowRun = {
    id: string;
    type: string;
    createdAt: string; // ISO
    postToGithub?: boolean;
    state: "running" | "completed" | "error" | "timedOut";
    issue?: { repoFullName: string; number: number };
    initiatorUserId?: string;
    initiatorGithubUserId?: string;
    initiatorGithubLogin?: string;
    repository?: { id?: string; fullName: string };
    installationId?: string;
  };
  - export interface WorkflowRunsRepository {
    list(filter: ListWorkflowRunsFilter): Promise<ListedWorkflowRun[]>;
    getById(id: string): Promise<ListedWorkflowRun | null>;
    listEvents(runId: string): Promise<WorkflowEventInput[]>;
  }
  - export interface DatabaseStorage {
    workflow: {
      run: {
        create(input: CreateWorkflowRunInput): Promise<WorkflowRunHandle>;
      };
    };
    runs: WorkflowRunsRepository;
  }

- File: shared/src/adapters/neo4j/StorageAdapter.ts
  - export class StorageAdapter implements DatabaseStorage {
    // ctor signature kept minimal to enable RSC import where DI is awkward
    constructor(params: { uri: string; user: string; password: string });
    workflow: {
      run: {
        create(input: CreateWorkflowRunInput): Promise<WorkflowRunHandle>;
      };
    };
    runs: WorkflowRunsRepository;
  }

- File: shared/src/lib/types/db/neo4j.ts
  - export type Neo4jWorkflowRunDTO = {
    id: string;
    type: string;
    createdAt: string; // ISO
    postToGithub?: boolean;
  };
  - export type Neo4jWorkflowEventDTO = {
    id?: string;
    runId: string;
    type: string;
    payload: unknown;
    createdAt: string; // ISO
  };
  - export type Neo4jIssueDTO = { repoFullName: string; number: number };
  - export type Neo4jRepositoryDTO = { id?: string; fullName: string };
  - export type Neo4jUserDTO = { id: string };
  - export type Neo4jGithubUserDTO = { id?: string; login?: string };
  - export type Neo4jInstallationDTO = { id: string };

## App/API surfaces (Next.js) using shared ports

- File: app/workflow-runs/page.tsx
  - Replace ad-hoc repo filter with shared repository calls
  - export default async function WorkflowRunsPage(): Promise<JSX.Element>
  - Internal helper used by the page:
    - async function listRunsForCurrentUser(): Promise<ListedWorkflowRun[]>
      - Input: none (reads current session via auth())
      - Output: ListedWorkflowRun[]

- File: app/[username]/[repo]/issues/[issueId]/page.tsx
  - Server-side prefetch of issue-scoped runs via shared repository
  - export default async function IssuePage(...): Promise<JSX.Element>
  - New/updated helper:
    - async function listRunsForIssue(params: { repoFullName: string; issueNumber: number }): Promise<ListedWorkflowRun[]>

- File: app/api/workflow-runs/route.ts
  - export const dynamic = "force-dynamic";
  - export async function GET(request: NextRequest): Promise<NextResponse<{ runs: ListedWorkflowRun[] }>>
    - Query params (optional):
      - by=initiator|repository|issue
      - repo: string (when by=repository or issue)
      - issue: number (when by=issue)
    - Output JSON shape: { runs: ListedWorkflowRun[] }

- File: app/api/workflow-runs/[workflowId]/events/route.ts
  - export const dynamic = "force-dynamic";
  - export async function GET(_req: NextRequest, ctx: { params: { workflowId: string } }): Promise<NextResponse<{ events: WorkflowEventInput[] }>>

- File: app/api/workflow-runs/[workflowId]/route.ts
  - export const dynamic = "force-dynamic";
  - export async function GET(_req: NextRequest, ctx: { params: { workflowId: string } }): Promise<NextResponse<{ run: ListedWorkflowRun | null }>>

- File: components/issues/IssueWorkflowRuns.tsx
  - Client component continues to poll the list API
  - Types it consumes from API response:
    - type IssueScopedRun = Pick<ListedWorkflowRun, "id" | "state" | "createdAt" | "type">;

## Workers and run initialization

- File: apps/workers/workflow-workers/src/orchestrators/* (call sites only)
  - On run start, create a workflow run with attribution via shared storage
  - New helper in workers to obtain a storage instance:
    - function getStorage(): DatabaseStorage
  - Orchestrators invoke:
    - const handle = await storage.workflow.run.create(input: CreateWorkflowRunInput);
    - await handle.append(event: WorkflowEventInput);

## Webhook attribution inputs (extraction only)

- File: app/api/webhook/github/route.ts
  - Extract actor from verified webhook and pass attribution fields into CreateWorkflowRunInput at run creation call sites (no shape change to this route itself here)

## Authorization helpers (call sites use them; shapes only)

- File: shared/src/ports/github/auth.ts (or existing auth provider)
  - export type Requester = { userId?: string; githubUserId?: string; githubLogin?: string };

- File: shared/src/usecases/workflows/resolveIssue.ts and related usecases
  - Use DatabaseStorage.runs.list with { by: "issue", issue: { repoFullName, issueNumber } }

## Back-compat: existing Neo4j service APIs (unchanged signatures)

Existing functions remain callable for now until all consumers migrate:

- File: lib/neo4j/services/workflow.ts
  - export async function initializeWorkflowRun(args: { id: string; type: string; issueNumber?: number; repoFullName?: string; postToGithub?: boolean }): Promise<{ issue?: { repoFullName: string; number: number }; run: { id: string; type: string; createdAt: Date; postToGithub?: boolean } }>
  - export async function listWorkflowRuns(issue?: { repoFullName: string; issueNumber: number }): Promise<( { id: string; type: string; createdAt: Date; postToGithub?: boolean } & { state: "running" | "completed" | "error" | "timedOut"; issue?: { repoFullName: string; number: number } } )[]>
  - export async function getIssuesActiveWorkflowMap(args: { repoFullName: string; issueNumbers: number[] }): Promise<Record<number, boolean>>
  - export async function getIssuesLatestRunningWorkflowIdMap(args: { repoFullName: string; issueNumbers: number[] }): Promise<Record<number, string | null>>
  - export async function getWorkflowRunWithDetails(workflowRunId: string): Promise<{ workflow: { id: string; type: string; createdAt: Date; postToGithub?: boolean }; events: any[]; issue?: { repoFullName: string; number: number } }>
  - export async function getWorkflowRunMessages(workflowRunId: string): Promise<any[]>
  - export async function getWorkflowRunEvents(workflowRunId: string): Promise<any[]>

## File structure summary (new/updated)

- shared/src/ports/db/index.ts
- shared/src/adapters/neo4j/StorageAdapter.ts
- shared/src/lib/types/db/neo4j.ts
- app/workflow-runs/page.tsx (update to use shared runs.list)
- app/[username]/[repo]/issues/[issueId]/page.tsx (prefetch via shared runs.list)
- app/api/workflow-runs/route.ts (list API -> shared runs.list)
- app/api/workflow-runs/[workflowId]/route.ts (details API -> shared runs.getById)
- app/api/workflow-runs/[workflowId]/events/route.ts (events API -> shared runs.listEvents)
- components/issues/IssueWorkflowRuns.tsx (consumes list API response shape)
- apps/workers/workflow-workers/src/orchestrators/* (call shared storage on create + append)

Notes
- All shapes are additive to maintain compatibility with current UI and storage.
- Only immutable identifiers are persisted at creation time; presentation data is fetched from GitHub APIs at read time (refer to PRD for rationale).

