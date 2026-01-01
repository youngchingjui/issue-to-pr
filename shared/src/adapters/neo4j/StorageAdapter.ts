import type {
  CreateWorkflowRunInput,
  DatabaseStorage,
  WorkflowEvent,
  WorkflowRun,
  WorkflowRunFilter,
  WorkflowRunHandle,
} from "@shared/ports/db/index"
import type { Session } from "neo4j-driver"

import type { Neo4jDataSource } from "./dataSource"

// Minimal StorageAdapter implementation that satisfies the DatabaseStorage port.
// Focused on add-only behavior for WorkflowRun creation with Repository/User nodes.
export class StorageAdapter implements DatabaseStorage {
  constructor(private readonly ds: Neo4jDataSource) {}

  public workflow = {
    run: {
      create: (input: CreateWorkflowRunInput): Promise<WorkflowRunHandle> =>
        this.createWorkflowRun(input),
      getById: (id: string): Promise<WorkflowRun | null> =>
        this.getWorkflowRunById(id),
      list: (filter: WorkflowRunFilter): Promise<WorkflowRun[]> =>
        this.listWorkflowRuns(filter),
      listEvents: (runId: string): Promise<WorkflowEvent[]> =>
        this.listWorkflowRunEvents(runId),
    },
  }

  private async createWorkflowRun(
    input: CreateWorkflowRunInput
  ): Promise<WorkflowRunHandle> {
    const session = this.ds.getSession("WRITE")
    try {
      const params: Record<string, unknown> = {
        runId: input.id,
        type: input.type,
        postToGithub: input.postToGithub,
        repo: {
          id: String(input.repository.id),
          nodeId: input.repository.nodeId,
          fullName: input.repository.fullName,
          owner: input.repository.owner,
          name: input.repository.name,
          defaultBranch: input.repository.defaultBranch ?? null,
          visibility: input.repository.visibility ?? null,
          hasIssues: input.repository.hasIssues ?? null,
        },
        issueNumber: input.issueNumber,
      }

      let actorCypher = ""
      if (input.actor.kind === "user") {
        params.userId = input.actor.userId
        actorCypher = `MERGE (actor:User {id: $userId})\nON CREATE SET actor.createdAt = datetime()`
      } else if (input.actor.kind === "webhook") {
        params.senderId = String(input.actor.sender.id)
        params.senderLogin = input.actor.sender.login
        params.webhook = {
          source: input.actor.source,
          event: input.actor.event,
          action: input.actor.action,
          installationId: input.actor.installationId,
        }
        actorCypher = `MERGE (actor:GithubUser {id: $senderId})\nON CREATE SET actor.login = $senderLogin, actor.createdAt = datetime()`
      } else {
        actorCypher = `MERGE (actor:System {id: 'system'})`
      }

      const cypher = `
        // Repository
        MERGE (repo:Repository { id: $repo.id })
        ON CREATE SET repo.nodeId = $repo.nodeId,
                      repo.fullName = $repo.fullName,
                      repo.owner = $repo.owner,
                      repo.name = $repo.name,
                      repo.defaultBranch = $repo.defaultBranch,
                      repo.visibility = $repo.visibility,
                      repo.hasIssues = $repo.hasIssues,
                      repo.createdAt = datetime()
        ON MATCH SET repo.nodeId = coalesce($repo.nodeId, repo.nodeId),
                     repo.fullName = coalesce($repo.fullName, repo.fullName),
                     repo.owner = coalesce($repo.owner, repo.owner),
                     repo.name = coalesce($repo.name, repo.name),
                     repo.defaultBranch = coalesce($repo.defaultBranch, repo.defaultBranch),
                     repo.visibility = coalesce($repo.visibility, repo.visibility),
                     repo.hasIssues = coalesce($repo.hasIssues, repo.hasIssues)

        // Actor
        ${actorCypher}

        // Issue (optional)
        MERGE (issue:Issue { number: $issueNumber, repoFullName: $repo.fullName })

        // WorkflowRun
        CREATE (wr:WorkflowRun { id: $runId, type: $type, postToGithub: $postToGithub, createdAt: datetime(), state: 'pending' })

        // Relationships
        MERGE (wr)-[:TARGETS]->(repo)
        MERGE (wr)-[:BASED_ON_ISSUE]->(issue)
        MERGE (wr)-[:INITIATED_BY]->(actor)
      `

      await session.run(cypher, params)
      return { id: input.id }
    } finally {
      await session.close()
    }
  }

  private async getWorkflowRunById(id: string): Promise<WorkflowRun | null> {
    const session = this.ds.getSession("READ")
    try {
      const res = await session.run(
        `MATCH (wr:WorkflowRun { id: $id })
         OPTIONAL MATCH (wr)-[:TARGETS]->(repo:Repository)
         RETURN wr { .id, .type, .createdAt, .postToGithub, .state } AS wr, repo.fullName AS repoFullName`,
        { id }
      )
      const rec = res.records[0]
      if (!rec) return null
      const wr = rec.get("wr") as {
        id: string
        type: string
        createdAt: { toString(): string }
        postToGithub: boolean
        state: WorkflowRun["state"]
      }
      const repoFullName = rec.get("repoFullName") as string | undefined
      return {
        id: wr.id,
        type: wr.type,
        createdAt: new Date(wr.createdAt.toString()),
        postToGithub: wr.postToGithub,
        state: wr.state ?? "pending",
        actor: { kind: "system" },
        repository: repoFullName ? { fullName: repoFullName } : undefined,
      }
    } finally {
      await session.close()
    }
  }

  private async listWorkflowRuns(
    _filter: WorkflowRunFilter
  ): Promise<WorkflowRun[]> {
    // Foundation PR: keep simple and return empty until wired by subsequent PRs.
    // Implementers can build queries using helpers in queries/workflowRuns/*
    return []
  }

  private async listWorkflowRunEvents(
    _runId: string
  ): Promise<WorkflowEvent[]> {
    return []
  }
}
