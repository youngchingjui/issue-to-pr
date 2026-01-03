/**
 * Integration tests for WorkflowRun creation via StorageAdapter.
 *
 * These tests verify the workflow run data model writes Repository, Issue,
 * Actor, and Commit nodes with the expected relationships.
 *
 * Setup:
 * 1. Ensure Neo4j is running locally
 * 2. Set environment variables in .env.local:
 *    - NEO4J_URI (e.g., bolt://localhost:7687)
 *    - NEO4J_USER (e.g., neo4j)
 *    - NEO4J_PASSWORD
 *
 * Run with: pnpm test:neo4j
 */

import { randomUUID } from "node:crypto"
import { isInt } from "neo4j-driver"

import { StorageAdapter } from "@/shared/adapters/neo4j/StorageAdapter"

import {
  cleanupWorkflowRunTestData,
  createTestDataSource,
  verifyConnection,
} from "./testUtils"

const toNumber = (value: unknown): number => {
  if (isInt(value)) {
    return value.toNumber()
  }
  return value as number
}

const buildCommitSha = (seed: string): string =>
  seed.replace(/-/g, "").padEnd(40, "0").slice(0, 40)

describe("StorageAdapter - WorkflowRun creation", () => {
  let adapter: StorageAdapter
  const dataSource = createTestDataSource()

  const runIds: string[] = []
  const repoIds: string[] = []
  const issues: { repoFullName: string; number: number }[] = []
  const userIds: string[] = []
  const githubUserIds: string[] = []
  const commitShas: string[] = []

  beforeAll(async () => {
    await verifyConnection(dataSource)
    adapter = new StorageAdapter(dataSource)
  })

  afterAll(async () => {
    await cleanupWorkflowRunTestData(dataSource, {
      runIds,
      repoIds,
      issues,
      userIds,
      githubUserIds,
      commitShas,
    })
    await dataSource.getDriver().close()
  })

  it("creates repository, issue, actor, and workflow run nodes for user actor", async () => {
    const runId = `test-run-${randomUUID()}`
    const repoId = Math.floor(Math.random() * 1_000_000_000)
    const issueNumber = 123456
    const repoFullName = `test-org/test-repo-${randomUUID()}`
    const userId = `user-${randomUUID()}`

    runIds.push(runId)
    repoIds.push(String(repoId))
    issues.push({ repoFullName, number: issueNumber })
    userIds.push(userId)

    await adapter.workflow.run.create({
      id: runId,
      type: "alignmentCheck",
      issueNumber,
      postToGithub: false,
      repository: {
        id: repoId,
        nodeId: `repo-node-${randomUUID()}`,
        fullName: repoFullName,
        owner: "test-org",
        name: "test-repo",
        defaultBranch: "main",
        visibility: "PUBLIC",
        hasIssues: true,
      },
      actor: {
        type: "user",
        userId,
      },
    })

    const session = dataSource.getSession("READ")
    try {
      const result = await session.run(
        `
        MATCH (wr:WorkflowRun { id: $runId })
        OPTIONAL MATCH (wr)-[:BASED_ON_REPOSITORY]->(repo:Repository)
        OPTIONAL MATCH (wr)-[:BASED_ON_ISSUE]->(issue:Issue)
        OPTIONAL MATCH (wr)-[:INITIATED_BY]->(actor)
        RETURN wr, repo, issue, labels(actor) AS actorLabels, actor
      `,
        { runId }
      )

      const record = result.records[0]
      expect(record).toBeDefined()

      const repo = record.get("repo")
      const issue = record.get("issue")
      const actorLabels = record.get("actorLabels") as string[]
      const actor = record.get("actor")

      expect(repo).not.toBeNull()
      expect(repo.properties.fullName).toBe(repoFullName)
      expect(repo.properties.id).toBe(String(repoId))

      expect(issue).not.toBeNull()
      expect(issue.properties.repoFullName).toBe(repoFullName)
      expect(toNumber(issue.properties.number)).toBe(issueNumber)

      expect(actorLabels).toContain("User")
      expect(actor.properties.id).toBe(userId)
    } finally {
      await session.close()
    }
  })

  it("creates commit and webhook actor relationships when commit data is provided", async () => {
    const runId = `test-run-${randomUUID()}`
    const repoId = Math.floor(Math.random() * 1_000_000_000)
    const issueNumber = 789012
    const repoFullName = `test-org/test-repo-${randomUUID()}`
    const githubUserId = `github-user-${randomUUID()}`
    const commitSha = buildCommitSha(randomUUID())

    runIds.push(runId)
    repoIds.push(String(repoId))
    issues.push({ repoFullName, number: issueNumber })
    githubUserIds.push(githubUserId)
    commitShas.push(commitSha)

    await adapter.workflow.run.create({
      id: runId,
      type: "resolveIssue",
      issueNumber,
      postToGithub: true,
      repository: {
        id: repoId,
        nodeId: `repo-node-${randomUUID()}`,
        fullName: repoFullName,
        owner: "test-org",
        name: "test-repo",
        defaultBranch: "main",
        visibility: "PRIVATE",
        hasIssues: true,
      },
      actor: {
        type: "webhook",
        source: "github",
        event: "workflow_dispatch",
        action: "requested",
        sender: { id: githubUserId, login: "test-sender" },
        installationId: "test-installation",
      },
      commit: {
        sha: commitSha,
        nodeId: `commit-node-${randomUUID()}`,
        message: "Test commit message",
        treeSha: buildCommitSha(randomUUID()),
        author: {
          name: "Test Author",
          email: "author@example.com",
          date: new Date().toISOString(),
        },
        committer: {
          name: "Test Committer",
          email: "committer@example.com",
          date: new Date().toISOString(),
        },
      },
    })

    const session = dataSource.getSession("READ")
    try {
      const result = await session.run(
        `
        MATCH (wr:WorkflowRun { id: $runId })
        OPTIONAL MATCH (wr)-[:BASED_ON_COMMIT]->(commit:Commit)
        OPTIONAL MATCH (wr)-[:INITIATED_BY]->(actor)
        OPTIONAL MATCH (commit)-[:IN_REPOSITORY]->(repo:Repository)
        RETURN commit, actor, labels(actor) AS actorLabels, repo
      `,
        { runId }
      )

      const record = result.records[0]
      expect(record).toBeDefined()

      const commit = record.get("commit")
      const actor = record.get("actor")
      const actorLabels = record.get("actorLabels") as string[]
      const repo = record.get("repo")

      expect(commit).not.toBeNull()
      expect(commit.properties.sha).toBe(commitSha)
      expect(commit.properties.message).toBe("Test commit message")

      expect(actorLabels).toContain("GithubUser")
      expect(actor.properties.id).toBe(githubUserId)

      expect(repo).not.toBeNull()
      expect(repo.properties.fullName).toBe(repoFullName)
    } finally {
      await session.close()
    }
  })
})
