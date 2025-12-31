import { getWorkflowRunWithDetails } from "@/shared/lib/neo4j/services/workflow"
import type {
  CreateWorkflowRunInput,
  DatabaseStorage,
  ListedWorkflowRun,
  ListWorkflowRunsFilter,
  WorkflowEventInput,
  WorkflowRunContext,
  WorkflowRunHandle,
  WorkflowRunsRepository,
} from "@/shared/ports/db"

import { Neo4jDataSource } from "./dataSource"
import { listEventsForWorkflowRun } from "./queries/workflowRuns/listEvents"
import { mapListEventsResult } from "./queries/workflowRuns/listEvents.mapper"
import { listForIssue } from "./queries/workflowRuns/listForIssue"
import { mapListForIssueResult } from "./queries/workflowRuns/listForIssue.mapper"

// Minimal, forward-compatible StorageAdapter. The goal is to provide the port
// shapes for callers while delegating to existing read APIs for now.
export class StorageAdapter implements DatabaseStorage {
  private readonly dataSource: Neo4jDataSource
  constructor(dataSource: Neo4jDataSource) {
    this.dataSource = dataSource
  }

  workflow = {
    run: {
      // v1: create provides a handle; attribution MERGEs are deferred for a later PR.
      create: async (
        input: CreateWorkflowRunInput
      ): Promise<WorkflowRunHandle> => {
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
    list: async (
      filter: ListWorkflowRunsFilter
    ): Promise<ListedWorkflowRun[]> => {
      const session = this.dataSource.getSession("READ")

      try {
        switch (filter.by) {
          case "issue":
            const result = await session.executeRead(async (tx) => {
              return await listForIssue(tx, {
                issue: {
                  number: filter.issue.issueNumber,
                  repoFullName: filter.issue.repoFullName,
                },
              })
            })
            return mapListForIssueResult(result)
          case "initiator":
            return []
          case "repository":
            return []
          default:
            throw new Error(`Unsupported filter: ${JSON.stringify(filter)}`)
        }
      } catch (error) {
        console.error(error)
        throw error
      } finally {
        await session.close()
      }
    },

    getById: async (id: string): Promise<ListedWorkflowRun | null> => {
      const result = await getWorkflowRunWithDetails(id)

      const wf = result.workflow
      if (!wf) return null

      return {
        id: wf.id,
        type: wf.type,
        createdAt: wf.createdAt.toISOString(),
        postToGithub: wf.postToGithub,
        state: "completed", // derive state not provided by getWithDetails here
        issue: result.issue
          ? {
              repoFullName: result.issue.repoFullName,
              number: result.issue.number,
            }
          : undefined,
        actor: { kind: "system" },
        repository: result.issue
          ? { fullName: result.issue.repoFullName }
          : undefined,
      }
    },

    listEvents: async (runId: string): Promise<WorkflowEventInput[]> => {
      const session = this.dataSource.getSession("READ")
      try {
        const events = await session.executeRead(async (tx) => {
          return await listEventsForWorkflowRun(tx, { workflowRunId: runId })
        })
        return mapListEventsResult(events)
      } catch (error) {
        console.error(error)
        throw error
      } finally {
        await session.close()
      }
    },
  }
}

export default StorageAdapter
