import type { AllEvents } from "@/shared/entities"
import { err, ok, type Result } from "@/shared/entities/result"
import {
  type WorkflowRun,
  type WorkflowRunActor,
} from "@/shared/entities/WorkflowRun"
import type {
  CommitAttachment,
  CreateWorkflowRunInput,
  DatabaseStorage,
  IssueAttachment,
  RepositoryAttachment,
  SettingsError,
  Target,
  WorkflowEventInput,
  WorkflowRunFilter,
  WorkflowRunHandle,
} from "@/shared/ports/db/index"

import type { Neo4jDataSource } from "./dataSource"
import { getUserSettings } from "./queries/users/getUserSettings"
import {
  addEvent,
  attachActor,
  attachCommit,
  attachIssue,
  attachRepository,
  createWorkflowRun,
  type CreateWorkflowRunParams,
  getWorkflowRunById,
  listByUser,
  listEventsForWorkflowRun,
  mapAddEventResult,
  mapDomainEventTypeToNeo4j,
  mapGetWorkflowRunById,
  mapListByUser,
  mapListEvents,
} from "./queries/workflowRuns"

export type Neo4jCtx = {
  ds: Neo4jDataSource
}

/**
 * Transforms CreateWorkflowRunInput to CreateWorkflowRunParams
 * Handles optional fields and progressive metadata attachment
 */
function transformCreateWorkflowRunInput(input: CreateWorkflowRunInput): {
  core: CreateWorkflowRunParams
  attach: {
    repository?: {
      id: string
      nodeId?: string
      owner: string
      name: string
      githubInstallationId?: string
    }
    issue?: { number: number; repoFullName: string }
    actor?: Parameters<typeof attachActor>[1]["actor"]
    commit?: { sha: string; nodeId?: string; message?: string }
  }
} {
  // Generate ID if not provided
  const runId = input.id ?? crypto.randomUUID()

  const core: CreateWorkflowRunParams = {
    runId,
    type: input.type,
    postToGithub: input.config?.postToGithub ?? false,
  }

  const attach: {
    repository?: {
      id: string
      nodeId?: string
      owner: string
      name: string
      githubInstallationId?: string
    }
    issue?: { number: number; repoFullName: string }
    actor?: Parameters<typeof attachActor>[1]["actor"]
    commit?: { sha: string; nodeId?: string; message?: string }
  } = {}

  // Add repository if provided via target (only attach when we have enough data)
  if (input.target?.repository) {
    const repo = input.target.repository
    if (repo.id != null && repo.owner && repo.name) {
      attach.repository = {
        id: String(repo.id),
        nodeId: repo.nodeId,
        owner: repo.owner,
        name: repo.name,
        githubInstallationId: repo.githubInstallationId,
      }
    }
  }

  // Add issue if provided via target
  if (input.target?.issue) {
    attach.issue = {
      number: input.target.issue.number,
      repoFullName: input.target.issue.repoFullName,
    }
  }

  // Add actor if provided
  if (input.actor) {
    if (input.actor.type === "user") {
      attach.actor = {
        actorType: "user",
        actorUserId: input.actor.userId,
      }
    } else if (input.actor.type === "webhook") {
      attach.actor = {
        actorType: "webhook",
        actorGithubUserId: input.actor.sender.id,
        actorGithubUserLogin: input.actor.sender.login,
        webhookEventId: `webhook-${runId}`,
        webhookEvent: input.actor.event,
        webhookAction: input.actor.action,
      }
    }
  }

  // Add commit if provided via target
  if (input.target?.ref?.type === "commit") {
    attach.commit = {
      sha: input.target.ref.sha,
    }
  }

  return { core, attach }
}

// Helper functions for handle methods
async function addEventToRun(
  ctx: Neo4jCtx,
  runId: string,
  event: WorkflowEventInput
): Promise<AllEvents> {
  const session = ctx.ds.getSession("WRITE")
  try {
    const eventId = crypto.randomUUID()
    const createdAt = event.createdAt ?? new Date().toISOString()

    // Map domain event type to Neo4j event type
    const neo4jEventType = mapDomainEventTypeToNeo4j(event.type)

    const result = await session.executeWrite((tx) =>
      addEvent(tx, {
        runId,
        eventId,
        eventType: neo4jEventType,
        content: JSON.stringify(event.payload),
        createdAt,
      })
    )

    return mapAddEventResult(result)
  } finally {
    await session.close()
  }
}

async function attachTargetToRun(
  ctx: Neo4jCtx,
  runId: string,
  target: Target
): Promise<void> {
  const session = ctx.ds.getSession("WRITE")
  try {
    await session.executeWrite(async (tx) => {
      // Attach repository
      if (target.repository) {
        if (
          target.repository.id == null ||
          !target.repository.owner ||
          !target.repository.name
        ) {
          // Can't attach without id - require caller to use handle.attach.repository()
          throw new Error(
            "Repository attachment via target requires repository.id + owner + name - use handle.attach.repository() instead"
          )
        }

        await attachRepository(tx, {
          runId,
          repoId: String(target.repository.id),
          repoNodeId: target.repository.nodeId,
          repoOwner: target.repository.owner,
          repoName: target.repository.name,
          repoGithubInstallationId: target.repository.githubInstallationId,
        })
      }

      // Attach issue
      if (target.issue) {
        await attachIssue(tx, {
          runId,
          issueNumber: target.issue.number,
          repoFullName: target.issue.repoFullName,
        })
      }

      // Attach commit
      if (target.ref?.type === "commit") {
        await attachCommit(tx, {
          runId,
          commitSha: target.ref.sha,
        })
      }
    })
  } finally {
    await session.close()
  }
}

async function attachActorToRun(
  ctx: Neo4jCtx,
  runId: string,
  actor: WorkflowRunActor
): Promise<void> {
  const session = ctx.ds.getSession("WRITE")
  try {
    let actorParams: Parameters<typeof attachActor>[1]["actor"]

    if (actor.type === "user") {
      actorParams = {
        actorType: "user",
        actorUserId: actor.userId,
      }
    } else if (actor.type === "webhook") {
      actorParams = {
        actorType: "webhook",
        actorGithubUserId: actor.sender.id,
        actorGithubUserLogin: actor.sender.login,
        webhookEventId: `webhook-${runId}`,
        webhookEvent: actor.event,
        webhookAction: actor.action,
      }
    } else {
      // Exhaustive check - should never reach here with proper typing
      const _exhaustive: never = actor
      throw new Error(`Invalid actor type: ${JSON.stringify(_exhaustive)}`)
    }

    await session.executeWrite((tx) =>
      attachActor(tx, { runId, actor: actorParams })
    )
  } finally {
    await session.close()
  }
}

async function attachRepositoryToRun(
  ctx: Neo4jCtx,
  runId: string,
  repo: RepositoryAttachment
): Promise<void> {
  const session = ctx.ds.getSession("WRITE")
  try {
    await session.executeWrite((tx) =>
      attachRepository(tx, {
        runId,
        repoId: String(repo.id),
        repoNodeId: repo.nodeId,
        repoOwner: repo.owner,
        repoName: repo.name,
        repoGithubInstallationId: repo.githubInstallationId,
      })
    )
  } finally {
    await session.close()
  }
}

async function attachIssueToRun(
  ctx: Neo4jCtx,
  runId: string,
  issue: IssueAttachment
): Promise<void> {
  const session = ctx.ds.getSession("WRITE")
  try {
    await session.executeWrite((tx) =>
      attachIssue(tx, {
        runId,
        issueNumber: issue.number,
        repoFullName: issue.repoFullName,
      })
    )
  } finally {
    await session.close()
  }
}

async function attachCommitToRun(
  ctx: Neo4jCtx,
  runId: string,
  commit: CommitAttachment
): Promise<void> {
  const session = ctx.ds.getSession("WRITE")
  try {
    await session.executeWrite((tx) =>
      attachCommit(tx, {
        runId,
        commitSha: commit.sha,
        commitNodeId: commit.nodeId,
        commitMessage: commit.message,
      })
    )
  } finally {
    await session.close()
  }
}

export async function runCreate(
  ctx: Neo4jCtx,
  input: CreateWorkflowRunInput
): Promise<WorkflowRunHandle> {
  const session = ctx.ds.getSession("WRITE")
  try {
    const { core, attach } = transformCreateWorkflowRunInput(input)

    const run = await session.executeWrite(async (tx) => {
      // 1) Create workflow run node
      await createWorkflowRun(tx, core)

      // 2) Attach metadata if provided (all in same transaction)
      if (attach.repository) {
        await attachRepository(tx, {
          runId: core.runId,
          repoId: attach.repository.id,
          repoNodeId: attach.repository.nodeId,
          repoOwner: attach.repository.owner,
          repoName: attach.repository.name,
          repoGithubInstallationId: attach.repository.githubInstallationId,
        })
      }

      if (attach.issue) {
        await attachIssue(tx, {
          runId: core.runId,
          issueNumber: attach.issue.number,
          repoFullName: attach.issue.repoFullName,
        })
      }

      if (attach.actor) {
        await attachActor(tx, {
          runId: core.runId,
          actor: attach.actor,
        })
      }

      if (attach.commit) {
        await attachCommit(tx, {
          runId: core.runId,
          commitSha: attach.commit.sha,
          commitNodeId: attach.commit.nodeId,
          commitMessage: attach.commit.message,
        })
      }

      // 3) Return the fully-populated WorkflowRun (including attachments)
      const full = await getWorkflowRunById(tx, { id: core.runId })
      const mapped = mapGetWorkflowRunById(full)
      if (!mapped) {
        throw new Error(`Failed to load created workflow run ${core.runId}`)
      }
      return mapped
    })

    return {
      run,
      add: {
        event: (event) => addEventToRun(ctx, run.id, event),
      },
      attach: {
        target: (target) => attachTargetToRun(ctx, run.id, target),
        actor: (actor) => attachActorToRun(ctx, run.id, actor),
        repository: (repo) => attachRepositoryToRun(ctx, run.id, repo),
        issue: (issue) => attachIssueToRun(ctx, run.id, issue),
        commit: (commit) => attachCommitToRun(ctx, run.id, commit),
      },
    }
  } finally {
    await session.close()
  }
}

export class StorageAdapter implements DatabaseStorage {
  private readonly ctx: Neo4jCtx

  constructor(private readonly ds: Neo4jDataSource) {
    this.ctx = {
      ds,
    }
  }

  public workflow = {
    run: {
      create: async (input: CreateWorkflowRunInput) =>
        runCreate(this.ctx, input),
      getById: async (id: string): Promise<WorkflowRun | null> => {
        const session = this.ds.getSession("READ")
        try {
          const result = await session.executeRead((tx) =>
            getWorkflowRunById(tx, { id })
          )
          return mapGetWorkflowRunById(result)
        } finally {
          await session.close()
        }
      },
      list: (filter: WorkflowRunFilter): Promise<WorkflowRun[]> =>
        this.listWorkflowRuns(filter),
    },
    events: {
      list: (runId: string): Promise<AllEvents[]> =>
        this.listWorkflowRunEvents(runId),
    },
  }

  public settings = {
    user: {
      getOpenAIKey: async (
        userId: string
      ): Promise<Result<string | null, SettingsError>> => {
        if (!userId) return ok(null)

        const session = this.ds.getSession("READ")
        try {
          const settings = await session.executeRead((tx) =>
            getUserSettings(tx, userId)
          )

          // User not found - this is an error condition
          if (settings === null) {
            return err("UserNotFound")
          }

          // User exists - check if they have a key configured
          const key = settings.openAIApiKey?.trim()
          return ok(key && key.length > 0 ? key : null)
        } catch (e) {
          console.error("[StorageAdapter] Error fetching OpenAI key:", e)
          return err("Unknown")
        } finally {
          await session.close()
        }
      },
    },
  }

  private async listWorkflowRuns(
    filter: WorkflowRunFilter
  ): Promise<WorkflowRun[]> {
    const userId = filter.userId
    if (userId) {
      const session = this.ds.getSession("READ")
      try {
        const result = await session.executeRead((tx) =>
          listByUser(tx, { user: { id: userId } })
        )
        return mapListByUser(result)
      } finally {
        await session.close()
      }
    }
    return []
  }

  private async listWorkflowRunEvents(runId: string): Promise<AllEvents[]> {
    const session = this.ds.getSession("READ")
    try {
      const result = await session.executeRead((tx) =>
        listEventsForWorkflowRun(tx, { workflowRunId: runId })
      )

      return mapListEvents(result)
    } finally {
      await session.close()
    }
  }
}
