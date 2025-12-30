import { withTiming } from "@/utils/telemetry"
import {
  getWorkflowRunEvents,
  getWorkflowRunWithDetails,
  listWorkflowRuns as listWorkflowRunsRaw,
} from "@/lib/neo4j/services/workflow"
import type {
  CreateWorkflowRunInput,
  DatabaseStorage,
  ListedWorkflowRun,
  ListWorkflowRunsFilter,
  WorkflowEventInput,
  WorkflowRunContext,
  WorkflowRunHandle,
  WorkflowRunsRepository,
} from "@/ports/db"

// Minimal, forward-compatible StorageAdapter. The goal is to provide the port
// shapes for callers while delegating to existing read APIs for now.
export class StorageAdapter implements DatabaseStorage {
  constructor(_params: { uri: string; user: string; password: string }) {
    // Connection handled by existing shared neo4j client under the hood.
  }

  workflow = {
    run: {
      // v1: create provides a handle; attribution MERGEs are deferred for a later PR.
      create: async (input: CreateWorkflowRunInput): Promise<WorkflowRunHandle> => {
        // For now, just ensure the run exists via existing initialize path when possible.
        // We intentionally avoid importing app-layer services from shared and only return a handle.
        const ctx: WorkflowRunContext = {
          runId: input.id,
          // repository/installation linkage can be resolved lazily later
        }
        return {
          ctx,
          append: async (_event: WorkflowEventInput) => {
            // No-op append in this scaffolding implementation.
            return
          },
        }
      },
    },
  }

  runs: WorkflowRunsRepository = {
    list: async (filter: ListWorkflowRunsFilter): Promise<ListedWorkflowRun[]> => {
      // Delegate to existing read APIs where possible; scope by issue only for now.
      if (filter.by === "issue") {
        const rows = await withTiming(
          "Neo4j READ: StorageAdapter.runs.list(issue)",
          () => listWorkflowRunsRaw(filter.issue)
        )
        return rows.map((r) => ({
          id: r.id,
          type: r.type,
          createdAt: r.createdAt.toISOString(),
          postToGithub: r.postToGithub,
          state: r.state,
          issue: r.issue
            ? { repoFullName: r.issue.repoFullName, number: r.issue.number }
            : undefined,
          actor: { kind: "system" as const },
          repository: r.issue
            ? { fullName: r.issue.repoFullName }
            : undefined,
        }))
      }

      // For initiator/repository filters: return an empty set for now until attribution is persisted.
      return []
    },

    getById: async (id: string): Promise<ListedWorkflowRun | null> => {
      const result = await withTiming(
        "Neo4j READ: StorageAdapter.runs.getById",
        () => getWorkflowRunWithDetails(id)
      )

      const wf = result.workflow
      if (!wf) return null

      return {
        id: wf.id,
        type: wf.type,
        createdAt: wf.createdAt.toISOString(),
        postToGithub: wf.postToGithub,
        state: "completed", // derive state not provided by getWithDetails here
        issue: result.issue
          ? { repoFullName: result.issue.repoFullName, number: result.issue.number }
          : undefined,
        actor: { kind: "system" },
        repository: result.issue
          ? { fullName: result.issue.repoFullName }
          : undefined,
      }
    },

    listEvents: async (runId: string): Promise<WorkflowEventInput[]> => {
      const events = await withTiming(
        "Neo4j READ: StorageAdapter.runs.listEvents",
        () => getWorkflowRunEvents(runId)
      )
      return events.map((e) => ({
        type: e.type,
        payload: e.payload as unknown,
        createdAt: (e as any).createdAt
          ? new Date((e as any).createdAt).toISOString()
          : undefined,
      }))
    },
  }
}

export default StorageAdapter

