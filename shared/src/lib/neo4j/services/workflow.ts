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
import type { WorkflowRun as DbWorkflowRun } from "@/lib/types/db/neo4j"

/**
 * Merges (matches or creates) a WorkflowRun node and the corresponding Issue node in the database, linking the two.
 */
export async function initializeWorkflowRun({
  id,
  type,
  issueNumber,
  repoFullName,
  postToGithub,
  initiatorGithubLogin,
}: {
  id: string
  type: WorkflowType
  issueNumber?: number
  repoFullName?: string
  postToGithub?: boolean
  initiatorGithubLogin?: string
}): Promise<{ issue?: AppIssue; run: AppWorkflowRun }> {
  const session = await n4j.getSession()
  try {
    const result = await withTiming(
      `Neo4j WRITE: initializeWorkflowRun ${repoFullName ?? "<no-repo>"}`,
      async () =>
        session.executeWrite(async (tx) => {
          const wfRunInput: Omit<DbWorkflowRun, "createdAt"> = {
            id,
            type,
            postToGithub,
            initiatorGithubLogin,
          }

          if (issueNumber && repoFullName) {
            return await mergeIssueLink(tx, {
              workflowRun: wfRunInput,
              issue: {
                repoFullName,
                number: int(issueNumber),
              },
            })
          }
          const run = await create(tx, wfRunInput)
          return {
            run,
            issue: null,
          }
        })
    )

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

