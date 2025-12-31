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
import { listByInitiator } from "./queries/workflowRuns/listByInitiator"
import { mapListByInitiatorResult } from "./queries/workflowRuns/listByInitiator.mapper"
import { listEventsForWorkflowRun } from "./queries/workflowRuns/listEvents"
import { mapListEventsResult } from "./queries/workflowRuns/listEvents.mapper"
import { listForIssue } from "./queries/workflowRuns/listForIssue"
import { mapListForIssueResult } from "./queries/workflowRuns/listForIssue.mapper"
import { listForRepo } from "./queries/workflowRuns/listForRepo"
import { mapListForRepoResult } from "./queries/workflowRuns/listForRepo.mapper"

// Minimal, forward-compatible StorageAdapter. The goal is to provide the port
// shapes for callers while delegating to existing read APIs for now.
export class StorageAdapter implements DatabaseStorage {
  private readonly dataSource: Neo4jDataSource
  constructor(dataSource: Neo4jDataSource) {
    this.dataSource = dataSource
  }

  workflow = {
    run: {
      create: async (
        input: CreateWorkflowRunInput
      ): Promise<WorkflowRunHandle> => {
        const session = this.dataSource.getSession("WRITE")

        try {
          // TODO: We should move all of these queries to a separate query file within the queries folder, similar to the pattern below.
          await session.executeWrite(async (tx) => {
            // MERGE Repository node if we have full repository data
            if (input.repository) {
              await tx.run(
                `
                MERGE (r:Repository {id: toString($repo.id)})
                SET r.nodeId = $repo.nodeId,
                    r.fullName = $repo.fullName,
                    r.owner = $repo.owner,
                    r.name = $repo.name,
                    r.defaultBranch = coalesce($repo.defaultBranch, r.defaultBranch),
                    r.visibility = coalesce($repo.visibility, r.visibility),
                    r.hasIssues = coalesce($repo.hasIssues, r.hasIssues),
                    r.lastUpdated = datetime()
                ON CREATE SET r.createdAt = datetime()
              `,
                {
                  repo: {
                    id: input.repository.id,
                    nodeId: input.repository.nodeId,
                    fullName: input.repository.fullName,
                    owner: input.repository.owner,
                    name: input.repository.name,
                    defaultBranch: input.repository.defaultBranch || null,
                    visibility: input.repository.visibility || null,
                    hasIssues: input.repository.hasIssues ?? null,
                  },
                }
              )
            } else if (input.repoFullName) {
              // Fallback for backward compatibility: create Repository with only fullName
              await tx.run(
                `
                MERGE (r:Repository {fullName: $repoFullName})
                ON CREATE SET
                  r.owner = split($repoFullName, '/')[0],
                  r.name = split($repoFullName, '/')[1],
                  r.createdAt = datetime()
              `,
                { repoFullName: input.repoFullName }
              )
            }

            // Create WorkflowRun node
            await tx.run(
              `
              CREATE (w:WorkflowRun {
                id: $runId,
                type: $type,
                createdAt: datetime(),
                postToGithub: coalesce($postToGithub, false)
              })
            `,
              {
                runId: input.id,
                type: input.type,
                postToGithub: input.postToGithub ?? false,
              }
            )

            // Create initiator attribution based on actor type
            if (input.actor.kind === "user") {
              // MERGE User node and create INITIATED_BY relationship
              await tx.run(
                `
                MATCH (w:WorkflowRun {id: $runId})
                MERGE (u:User {id: $userId})
                MERGE (w)-[:INITIATED_BY]->(u)
              `,
                {
                  runId: input.id,
                  userId: input.actor.userId,
                }
              )

              // If GitHub info provided, MERGE GithubUser and link to User
              if (input.actor.github?.id) {
                await tx.run(
                  `
                  MATCH (u:User {id: $userId})
                  MERGE (gh:GithubUser {id: $githubId})
                  SET gh.login = $githubLogin
                  MERGE (u)-[:LINKED_GITHUB_USER]->(gh)
                `,
                  {
                    userId: input.actor.userId,
                    githubId: input.actor.github.id,
                    githubLogin: input.actor.github.login ?? null,
                  }
                )
              }
            } else if (input.actor.kind === "webhook") {
              // Create GithubWebhookEvent node and INITIATED_BY relationship
              // Follows GitHub webhook structure: event type (from header) + action (from payload)
              const eventId = `${input.id}-webhook-event`
              await tx.run(
                `
                MATCH (w:WorkflowRun {id: $runId})
                CREATE (e:GithubWebhookEvent {
                  id: $eventId,
                  event: $event,
                  action: $action,
                  createdAt: datetime()
                })
                CREATE (w)-[:INITIATED_BY]->(e)
              `,
                {
                  runId: input.id,
                  eventId,
                  event: input.actor.event ?? "unknown",
                  action: input.actor.action ?? null,
                }
              )

              // If webhook sender info provided, MERGE GithubUser and link to event
              if (input.actor.sender?.id) {
                await tx.run(
                  `
                  MATCH (e:GithubWebhookEvent {id: $eventId})
                  MERGE (gh:GithubUser {id: $senderId})
                  SET gh.login = $senderLogin
                  MERGE (e)-[:SENDER]->(gh)
                `,
                  {
                    eventId,
                    senderId: input.actor.sender.id,
                    senderLogin: input.actor.sender.login ?? null,
                  }
                )
              }

              // Create UNDER_INSTALLATION relationship if installationId provided
              if (input.actor.installationId) {
                await tx.run(
                  `
                  MATCH (w:WorkflowRun {id: $runId})
                  MERGE (inst:Installation {githubInstallationId: $installationId})
                  ON CREATE SET inst.id = $installationId
                  MERGE (w)-[:UNDER_INSTALLATION]->(inst)
                `,
                  {
                    runId: input.id,
                    installationId: input.actor.installationId,
                  }
                )
              }
            }

            // Link WorkflowRun to Repository
            if (input.repository) {
              await tx.run(
                `
                MATCH (w:WorkflowRun {id: $runId})
                MATCH (r:Repository {id: toString($repoId)})
                MERGE (w)-[:BASED_ON_REPOSITORY]->(r)
              `,
                { runId: input.id, repoId: input.repository.id }
              )
            } else if (input.repoFullName) {
              await tx.run(
                `
                MATCH (w:WorkflowRun {id: $runId})
                MATCH (r:Repository {fullName: $repoFullName})
                MERGE (w)-[:BASED_ON_REPOSITORY]->(r)
              `,
                { runId: input.id, repoFullName: input.repoFullName }
              )
            }

            // Link WorkflowRun to Issue if provided
            if (input.issueNumber && (input.repoFullName || input.repository)) {
              const repoFullName =
                input.repository?.fullName || input.repoFullName
              await tx.run(
                `
                MATCH (w:WorkflowRun {id: $runId})
                MATCH (i:Issue {number: $issueNumber, repoFullName: $repoFullName})
                MERGE (w)-[:BASED_ON_ISSUE]->(i)
              `,
                {
                  runId: input.id,
                  issueNumber: input.issueNumber,
                  repoFullName,
                }
              )
            }
          })

          const ctx: WorkflowRunContext = {
            runId: input.id,
            repoId: input.repository?.id.toString(),
            installationId:
              input.actor.kind === "webhook"
                ? input.actor.installationId
                : undefined,
          }

          return {
            ctx,
            append: async (_event: WorkflowEventInput) => {
              // No-op append in this scaffolding implementation.
              return
            },
          }
        } finally {
          await session.close()
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
          case "issue": {
            const result = await session.executeRead(async (tx) => {
              return await listForIssue(tx, {
                issue: {
                  number: filter.issue.issueNumber,
                  repoFullName: filter.issue.repoFullName,
                },
              })
            })
            return mapListForIssueResult(result)
          }
          case "initiator": {
            const result = await session.executeRead(async (tx) => {
              return await listByInitiator(tx, {
                user: filter.user,
              })
            })
            return mapListByInitiatorResult(result)
          }
          case "repository": {
            const result = await session.executeRead(async (tx) => {
              return await listForRepo(tx, {
                repo: filter.repo,
              })
            })
            return mapListForRepoResult(result)
          }
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
