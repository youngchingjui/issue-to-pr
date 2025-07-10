import { int } from "neo4j-driver"

import { n4j } from "@/lib/neo4j/client"
import {
  getEventsForWorkflowRun,
  getMessagesForWorkflowRun,
  toAppEvent,
  toAppMessageEvent,
} from "@/lib/neo4j/repositories/event"
import { toAppIssue } from "@/lib/neo4j/repositories/issue"
import {
  create,
  getWithDetails,
  listAll,
  listForIssue,
  mergeIssueLink,
  toAppWorkflowRun,
} from "@/lib/neo4j/repositories/workflowRun"
import {
  AnyEvent,
  Issue as AppIssue,
  MessageEvent,
  WorkflowRun as AppWorkflowRun,
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
    const result = await session.executeWrite(async (tx) => {
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

    // Transform database models to application models outside the transaction
    return {
      run: toAppWorkflowRun(result.run),
      ...(result.issue && { issue: toAppIssue(result.issue) }),
    }
  } finally {
    await session.close()
  }
}

/**
 * Now returns workflows with optional 'issue' field & proper type
 */
export async function listWorkflowRuns(issue?: {
  repoFullName: string
  issueNumber: number
}): Promise<
  (AppWorkflowRun & { state: WorkflowRunState; issue?: AppIssue })[]
> {
  const session = await n4j.getSession()
  try {
    const result = await session.executeRead(async (tx) => {
      if (issue) {
        return await listForIssue(tx, {
          repoFullName: issue.repoFullName,
          number: int(issue.issueNumber),
        })
      }

      return await listAll(tx)
    })

    return result
      .map((run) => ({
        ...toAppWorkflowRun(run),
        state: run.state,
        issue: run.issue,
      }))
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
    const { workflow, events, issue } = await session.executeRead(
      async (tx) => {
        return await getWithDetails(tx, workflowRunId)
      }
    )
    return {
      workflow: toAppWorkflowRun(workflow),
      events: await Promise.all(events.map((e) => toAppEvent(e, workflow.id))),
      issue: issue ? toAppIssue(issue) : undefined,
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
    const dbEvents = await session.executeRead(async (tx) => {
      return await getMessagesForWorkflowRun(tx, workflowRunId)
    })
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
    const dbEvents = await session.executeRead(async (tx) => {
      return await getEventsForWorkflowRun(tx, workflowRunId)
    })
    return await Promise.all(dbEvents.map((e) => toAppEvent(e, workflowRunId)))
  } finally {
    await session.close()
  }
}
