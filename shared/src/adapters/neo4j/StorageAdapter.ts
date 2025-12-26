import { int } from "neo4j-driver"
import { n4j } from "shared/lib/neo4j/client"

import type {
  CreateWorkflowRunInput,
  DatabaseStorage,
  WorkflowEventInput,
  WorkflowRunContext,
  WorkflowRunHandle,
} from "shared/ports/db"

// Minimal storage adapter for Neo4j to support run initialization and event appends.
// This intentionally stores only immutable identifiers and basic attribution fields.
export class Neo4jStorageAdapter implements DatabaseStorage {
  workflow = {
    run: {
      create: async (input: CreateWorkflowRunInput): Promise<WorkflowRunHandle> => {
        const session = await n4j.getSession()
        try {
          const { id, type } = input
          // Create the WorkflowRun node (MERGE semantics via separate merge query when linked to Issue)
          if (input.issueNumber && input.repoFullName) {
            await session.executeWrite(async (tx) => {
              await tx.run(
                `
                MERGE (w:WorkflowRun {id: $id})
                  ON CREATE SET w.type = $type,
                                w.createdAt = datetime(),
                                w.postToGithub = $postToGithub,
                                w.initiatorGithubLogin = $initiatorGithubLogin
                MERGE (i:Issue {repoFullName: $repoFullName, number: $issueNumber})
                MERGE (w)-[:BASED_ON_ISSUE]->(i)
              `,
                {
                  id,
                  type,
                  postToGithub: input.postToGithub ?? null,
                  initiatorGithubLogin: input.initiatorGithubLogin ?? null,
                  repoFullName: input.repoFullName,
                  issueNumber: int(input.issueNumber),
                }
              )
            })
          } else {
            await session.executeWrite(async (tx) => {
              await tx.run(
                `CREATE (w:WorkflowRun {id: $id, type: $type, createdAt: datetime(), postToGithub: $postToGithub, initiatorGithubLogin: $initiatorGithubLogin})`,
                {
                  id,
                  type,
                  postToGithub: input.postToGithub ?? null,
                  initiatorGithubLogin: input.initiatorGithubLogin ?? null,
                }
              )
            })
          }

          const ctx: WorkflowRunContext = {
            runId: id,
          }

          const handle: WorkflowRunHandle = {
            ctx,
            append: async (event: WorkflowEventInput) => {
              const session = await n4j.getSession()
              try {
                await session.executeWrite(async (tx) => {
                  await tx.run(
                    `
                    MATCH (w:WorkflowRun {id: $workflowId})
                    CREATE (e:Event {id: randomUUID(), type: $type, payload: $payload, createdAt: coalesce(datetime($createdAt), datetime())})
                    MERGE (w)-[:NEXT]->(e)
                  `,
                    {
                      workflowId: id,
                      type: event.type,
                      payload: event.payload ?? null,
                      createdAt: event.createdAt ?? null,
                    }
                  )
                })
              } finally {
                await session.close()
              }
            },
          }

          return handle
        } finally {
          await session.close()
        }
      },
    },
  }
}

export default Neo4jStorageAdapter

