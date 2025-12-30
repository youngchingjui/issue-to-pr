import neo4j, { type Driver, Integer, Node, type Session } from "neo4j-driver"

import { Issue } from "@/entities/Issue"
import { listForIssue } from "@/lib/neo4j/repositories/workflowRun"
import {
  issueSchema,
  WorkflowRun,
  workflowRunSchema,
  WorkflowRunState,
  workflowRunStateSchema,
} from "@/lib/types"
import { Neo4jDataSource } from "@/shared/adapters/neo4j/dataSource"
import {
  getWorkflowRunEvents,
  getWorkflowRunWithDetails,
  listWorkflowRuns as listWorkflowRunsRaw,
} from "@/shared/lib/neo4j/services/workflow"
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
      // Delegate to existing read APIs where possible; scope by issue only for now.
      switch (filter.by) {
        case "issue":
          // const rows = await listWorkflowRunsRaw(filter.issue)

          const session = this.dataSource.getSession("READ")

          try {
            const result = await session.executeRead(async (tx) => {
              const internalResult = await tx.run<{
                w: Node<Integer, WorkflowRun, "WorkflowRun">
                state: WorkflowRunState
                i: Node<Integer, Issue, "Issue">
              }>(
                `MATCH (w:WorkflowRun)-[:BASED_ON_ISSUE]->(i:Issue {number: $filter.issue.number, repoFullName: $filter.issue.repoFullName})
                OPTIONAL MATCH (w)-[:STARTS_WITH|NEXT*]->(e:Event {type: 'workflowState'})
                WITH w, e, i
                ORDER BY e.createdAt DESC
                WITH w, collect(e)[0] as latestWorkflowState, i
                RETURN w, latestWorkflowState.state AS state, i
                `,
                { filter }
              )

              return internalResult.records.map((record) => {
                const run = workflowRunSchema.parse(record.get("w").properties)
                const stateParse = workflowRunStateSchema.safeParse(
                  record.get("state")
                )
                const state: WorkflowRunState = stateParse.success
                  ? stateParse.data
                  : "completed"
                const issue = issueSchema.parse(record.get("i").properties)
                return {
                  run,
                  state,
                  issue,
                }
              })
            })

            return result.map((r) => ({
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
          } catch (error) {
            console.error(error)
            throw error
          } finally {
            await session.close()
          }
        case "initiator":
          return []
        case "repository":
          return []
        default:
          throw new Error(`Unsupported filter: ${JSON.stringify(filter)}`)
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
      const events = await getWorkflowRunEvents(runId)
      return events.map((e) => ({
        type: e.type,
        payload: e.payload,
        createdAt: e.createdAt
          ? new Date(e.createdAt).toISOString()
          : undefined,
      }))
    },
  }
}

export default StorageAdapter
