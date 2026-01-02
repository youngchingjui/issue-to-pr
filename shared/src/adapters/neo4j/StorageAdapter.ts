import { AllEvents } from "@/shared/entities"
import { WorkflowRun, WorkflowRunActor } from "@/shared/entities/WorkflowRun"
import type {
  CreateWorkflowRunInput,
  DatabaseStorage,
  WorkflowRunFilter,
  WorkflowRunHandle,
} from "@/shared/ports/db/index"

import type { Neo4jDataSource } from "./dataSource"
import { listEventsForWorkflowRun, mapListEvents } from "./queries/workflowRuns"

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
      listEvents: (runId: string): Promise<AllEvents[]> =>
        this.listWorkflowRunEvents(runId),
    },
  }

  // TODO: Create a query helper file for this.
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

      // Add commit params if provided
      let commitCypher = ""
      if (input.commit) {
        params.commit = {
          sha: input.commit.sha,
          nodeId: input.commit.nodeId,
          message: input.commit.message,
          treeSha: input.commit.treeSha,
          authorName: input.commit.author.name,
          authorEmail: input.commit.author.email,
          authoredAt: input.commit.author.date,
          committerName: input.commit.committer.name,
          committerEmail: input.commit.committer.email,
          committedAt: input.commit.committer.date,
        }
        commitCypher = `
        // Commit (optional - MERGE to avoid duplicates)
        MERGE (commit:Commit { sha: $commit.sha })
        ON CREATE SET commit.nodeId = $commit.nodeId,
                      commit.message = $commit.message,
                      commit.treeSha = $commit.treeSha,
                      commit.authorName = $commit.authorName,
                      commit.authorEmail = $commit.authorEmail,
                      commit.authoredAt = datetime($commit.authoredAt),
                      commit.committerName = $commit.committerName,
                      commit.committerEmail = $commit.committerEmail,
                      commit.committedAt = datetime($commit.committedAt),
                      commit.createdAt = datetime()
        `
      }

      let actorCypher = ""
      if (input.actor.type === "user") {
        params.userId = input.actor.userId
        actorCypher = `MERGE (actor:User {id: $userId})\nON CREATE SET actor.createdAt = datetime()`
      } else if (input.actor.type === "webhook") {
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

        ${commitCypher}

        // WorkflowRun
        CREATE (wr:WorkflowRun { id: $runId, type: $type, postToGithub: $postToGithub, createdAt: datetime(), state: 'pending' })

        // Relationships
        MERGE (wr)-[:TARGETS]->(repo)
        MERGE (wr)-[:BASED_ON_ISSUE]->(issue)
        MERGE (wr)-[:INITIATED_BY]->(actor)
        ${input.commit ? "MERGE (wr)-[:BASED_ON_COMMIT]->(commit)" : ""}
        ${input.commit ? "MERGE (commit)-[:IN_REPOSITORY]->(repo)" : ""}
      `

      await session.run(cypher, params)
      return { id: input.id }
    } finally {
      await session.close()
    }
  }

  // TODO: Create a query helper file for this.
  private async getWorkflowRunById(id: string): Promise<WorkflowRun | null> {
    const session = this.ds.getSession("READ")
    try {
      // TODO: This is not exactly the right implementation. Something is off with actor attribution, mixing of domain and adapter types. To be reviewed.
      const res = await session.run(
        `MATCH (wr:WorkflowRun { id: $id })
         OPTIONAL MATCH (wr)-[:TARGETS]->(repo:Repository)
         OPTIONAL MATCH (wr)-[:INITIATED_BY]->(actor:User)
         OPTIONAL MATCH (wr)-[:INITIATED_BY]->(actor:GithubUser)
         RETURN wr { .id, .type, .createdAt, .postToGithub, .state } AS wr, repo.fullName AS repoFullName, actor as actor`,
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
      const actor = rec.get("actor") as WorkflowRunActor
      const repoFullName = rec.get("repoFullName") as string | undefined
      return {
        id: wr.id,
        type: wr.type,
        createdAt: new Date(wr.createdAt.toString()),
        postToGithub: wr.postToGithub,
        state: wr.state ?? "pending",
        actor: actor,
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
