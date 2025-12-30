import { int } from "neo4j-driver"
import { withTiming } from "shared/utils/telemetry"

import { n4j } from "@/lib/neo4j/client"
import { neo4jToJs, toAppEvent, toAppMessageEvent } from "@/lib/neo4j/convert"
import {
  getEventsForWorkflowRun,
  getMessagesForWorkflowRun,
} from "@/lib/neo4j/repositories/event"
import {
  create,
  getWithDetails,
  listAll,
  listForIssue,
  mergeIssueLink,
} from "@/lib/neo4j/repositories/workflowRun"
import { listLatestStatesForIssues } from "@/lib/neo4j/repositories/workflowRun.batch"
import {
  AnyEvent,
  Issue as AppIssue,
  issueSchema,
  MessageEvent,
  WorkflowRun as AppWorkflowRun,
  workflowRunSchema,
  WorkflowRunState,
  WorkflowType,
} from "@/lib/types"

/**
 * Merges (matches or creates) a WorkflowRun node and the corresponding Issue node in the database, linking the two.
 *
 * If a WorkflowRun or Issue node does not exist, it will be created. If they are matched on the following properties, then they will be used:
 * - id (workflowRun)
 * - repoFullName (issue)
 * - issueNumber (issue)
 *
 * The function then links the WorkflowRun to the Issue with the following pattern:
 * (w:WorkflowRun)-[:BASED_ON_ISSUE]->(i:Issue)
 * and returns the application representations of both.
 */
export async function initializeWorkflowRun({
  id,
  type,
  issueNumber,
  repoFullName,
  postToGithub,
}: {
  id: string
  type: WorkflowType
  issueNumber?: number
  repoFullName?: string
  postToGithub?: boolean
}): Promise<{ issue?: AppIssue; run: AppWorkflowRun }> {
  const session = await n4j.getSession()
  try {
    // Handle database operations within transaction
    const result = await withTiming(
      `Neo4j WRITE: initializeWorkflowRun ${repoFullName ?? "<no-repo>"}`,
      async () =>
        session.executeWrite(async (tx) => {
          // If we have both issueNumber and repoFullName, create and link the issue
          if (issueNumber && repoFullName) {
            return await mergeIssueLink(tx, {
              workflowRun: {
                id,
                type,
                postToGithub,
              },
              issue: {
                repoFullName,
                number: int(issueNumber),
              },
            })
          }

          // Otherwise just create the workflow run without an issue
          const run = await create(tx, {
            id,
            type,
            postToGithub,
          })
          return {
            run,
            issue: null,
          }
        })
    )

    // Transform database models to application models outside the transaction
    return {
      run: workflowRunSchema.parse(neo4jToJs(result.run)),
      ...(result.issue && {
        issue: issueSchema.parse(neo4jToJs(result.issue)),
      }),
    }
  } finally {
    await session.close()
  }
}

const WORKFLOW_TIMEOUT_MS = 60 * 60 * 1000 // 1 hour

function deriveState(
  state: WorkflowRunState | null,
  createdAt: Date
): WorkflowRunState {
  if (state === "running") {
    const ageMs = Date.now() - createdAt.getTime()
    if (ageMs > WORKFLOW_TIMEOUT_MS) {
      return "timedOut"
    }
  }
  return state ?? "completed"
}

/**
 * @deprecated Use StorageAdapter.runs.list instead
 * Returns workflows with run state and connected issue (if any)
 */
export async function listWorkflowRuns(issue?: {
  repoFullName: string
  issueNumber: number
}): Promise<
  (AppWorkflowRun & { state: WorkflowRunState; issue?: AppIssue })[]
> {
  const session = await n4j.getSession()
  try {
    const result = await withTiming(
      `Neo4j READ: listWorkflowRuns ${issue ? `${issue.repoFullName}#${issue.issueNumber}` : "all"}`,
      async () =>
        session.executeRead(async (tx) => {
          if (issue) {
            return await listForIssue(tx, {
              repoFullName: issue.repoFullName,
              number: int(issue.issueNumber),
            })
          }
          return await listAll(tx)
        })
    )

    return result
      .map(({ run, state, issue }) => {
        const appRun = workflowRunSchema.parse(neo4jToJs(run))
        const derivedState = deriveState(state, appRun.createdAt)
        const appIssue = issue ? issueSchema.parse(neo4jToJs(issue)) : undefined
        return {
          ...appRun,
          state: derivedState,
          issue: appIssue,
        }
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  } finally {
    await session.close()
  }
}

/**
 * Batch fetch: for a set of issues, determine whether any workflow run is currently active (running).
 * Applies the same deriveState timeout logic to avoid stale running states.
 */
export async function getIssuesActiveWorkflowMap({
  repoFullName,
  issueNumbers,
}: {
  repoFullName: string
  issueNumbers: number[]
}): Promise<Record<number, boolean>> {
  const session = await n4j.getSession()
  try {
    const rows = await withTiming(
      `Neo4j READ: getIssuesActiveWorkflowMap ${repoFullName} [${issueNumbers.join(", ")}]`,
      async () =>
        session.executeRead(async (tx) =>
          listLatestStatesForIssues(tx, { repoFullName, issueNumbers })
        )
    )

    // Initialize all as false
    const map: Record<number, boolean> = {}
    for (const n of issueNumbers) map[n] = false

    // Group rows by issue and check if any run is effectively running
    for (const row of rows) {
      const issueNumber = row.issue.number.toNumber()
      const run = row.run
      const effective = deriveState(row.state, run.createdAt.toStandardDate())
      if (effective === "running") {
        map[issueNumber] = true
      }
    }

    return map
  } finally {
    await session.close()
  }
}

/**
 * Batch fetch: for a set of issues, return the id of the latest running workflow (if any) per issue.
 * Uses the same deriveState timeout logic to avoid stale running states.
 */
export async function getIssuesLatestRunningWorkflowIdMap({
  repoFullName,
  issueNumbers,
}: {
  repoFullName: string
  issueNumbers: number[]
}): Promise<Record<number, string | null>> {
  const session = await n4j.getSession()
  try {
    const rows = await withTiming(
      `Neo4j READ: getIssuesLatestRunningWorkflowIdMap ${repoFullName} [${issueNumbers.join(", ")}]`,
      async () =>
        session.executeRead(async (tx) =>
          listLatestStatesForIssues(tx, { repoFullName, issueNumbers })
        )
    )

    const map: Record<number, { id: string; createdAt: Date } | null> = {}

    for (const n of issueNumbers) map[n] = null

    for (const row of rows) {
      const issueNumber = row.issue.number.toNumber()
      const run = row.run
      const effective = deriveState(row.state, run.createdAt.toStandardDate())
      if (effective !== "running") continue

      const current = map[issueNumber]
      const createdAt = run.createdAt.toStandardDate()
      if (!current || createdAt > current.createdAt) {
        map[issueNumber] = { id: run.id, createdAt }
      }
    }

    // Flatten to id | null
    const idMap: Record<number, string | null> = {}
    for (const key of Object.keys(map)) {
      const num = Number(key)
      idMap[num] = map[num]?.id ?? null
    }

    return idMap
  } finally {
    await session.close()
  }
}

/**
 * Retrieves a WorkflowRun with its associated events and issue.
 */
export async function getWorkflowRunWithDetails(
  workflowRunId: string
): Promise<{
  workflow: AppWorkflowRun
  events: AnyEvent[]
  issue?: AppIssue
}> {
  const session = await n4j.getSession()
  try {
    const { workflow, events, issue } = await withTiming(
      `Neo4j READ: getWorkflowRunWithDetails ${workflowRunId}`,
      async () =>
        session.executeRead(async (tx) => {
          return await getWithDetails(tx, workflowRunId)
        })
    )
    return {
      workflow: workflowRunSchema.parse(neo4jToJs(workflow)),
      events: await Promise.all(events.map((e) => toAppEvent(e, workflow.id))),
      issue: issue ? issueSchema.parse(neo4jToJs(issue)) : undefined,
    }
  } finally {
    await session.close()
  }
}

export async function getWorkflowRunMessages(
  workflowRunId: string
): Promise<MessageEvent[]> {
  const session = await n4j.getSession()
  try {
    const dbEvents = await withTiming(
      `Neo4j READ: getWorkflowRunMessages ${workflowRunId}`,
      async () =>
        session.executeRead(async (tx) => {
          return await getMessagesForWorkflowRun(tx, workflowRunId)
        })
    )
    return await Promise.all(
      dbEvents.map((e) => toAppMessageEvent(e, workflowRunId))
    )
  } finally {
    await session.close()
  }
}

export async function getWorkflowRunEvents(
  workflowRunId: string
): Promise<AnyEvent[]> {
  const session = await n4j.getSession()
  try {
    const dbEvents = await withTiming(
      `Neo4j READ: getWorkflowRunEvents ${workflowRunId}`,
      async () =>
        session.executeRead(async (tx) => {
          return await getEventsForWorkflowRun(tx, workflowRunId)
        })
    )
    return await Promise.all(dbEvents.map((e) => toAppEvent(e, workflowRunId)))
  } finally {
    await session.close()
  }
}
