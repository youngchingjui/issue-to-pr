import neo4j from "neo4j-driver"
import type { QueryResult } from "neo4j-driver"

import { type AllEvents } from "@/shared/entities"
import type { WorkflowRun } from "@/shared/entities/WorkflowRun"

import { mapAddEventResult } from "@/shared/adapters/neo4j/queries/workflowRuns/addEvent.mapper"
import { mapCreateWorkflowRunResult } from "@/shared/adapters/neo4j/queries/workflowRuns/createWorkflowRun.mapper"
import { mapListByUser } from "@/shared/adapters/neo4j/queries/workflowRuns/listByUser.mapper"
import { mapListEvents } from "@/shared/adapters/neo4j/queries/workflowRuns/listEvents.mapper"
import { mapListForRepoResult } from "@/shared/adapters/neo4j/queries/workflowRuns/listForRepo.mapper"

// Helper to build a fake QueryResult with records that have a `.get(key)` method
function makeRecord(values: Record<string, unknown>) {
  return {
    get: (key: string) => values[key],
  } as unknown as any
}

function makeQueryResult<T>(records: any[]): QueryResult<T> {
  return { records } as unknown as QueryResult<T>
}

const now = new Date("2024-01-02T03:04:05.000Z")
const dt = neo4j.types.DateTime.fromStandardDate(now)

describe("Neo4j workflow run mappers", () => {
  describe("mapAddEventResult", () => {
    it("throws when no record", () => {
      const result = makeQueryResult<unknown>([])
      expect(() => mapAddEventResult(result as any)).toThrow("No event was created")
    })

    it("maps error, status, systemPrompt, userMessage, llmResponse, reviewComment", () => {
      const samples = [
        { type: "error", content: "boom" },
        { type: "status", content: "working" },
        { type: "systemPrompt", content: "you are helpful" },
        { type: "userMessage", content: "hi" },
        { type: "llmResponse", content: "hello" },
        { type: "reviewComment", content: "nit" },
      ] as const

      for (const [i, s] of samples.entries()) {
        const id = `e-${i}`
        const result = makeQueryResult([
          makeRecord({
            eventId: id,
            eventType: s.type,
            content: s.content,
            createdAt: dt,
          }),
        ])

        const mapped = mapAddEventResult(result as any)
        // Basic shape assertions per type
        switch (s.type) {
          case "error":
            expect(mapped).toEqual({ id, timestamp: now, type: "workflow.error", message: s.content })
            break
          case "status":
            expect(mapped).toEqual({ id, timestamp: now, type: "status", content: s.content })
            break
          case "systemPrompt":
            expect(mapped).toEqual({ timestamp: now.toISOString(), type: "system_prompt", content: s.content, metadata: {} })
            break
          case "userMessage":
            expect(mapped).toEqual({ timestamp: now.toISOString(), type: "user_message", content: s.content, metadata: {} })
            break
          case "llmResponse":
            expect(mapped).toEqual({ timestamp: now.toISOString(), type: "assistant_message", content: s.content, metadata: {} })
            break
          case "reviewComment":
            expect(mapped).toEqual({ timestamp: now.toISOString(), type: "assistant_message", content: s.content, metadata: { original_type: "reviewComment" } })
            break
        }
      }
    })
  })

  describe("mapCreateWorkflowRunResult", () => {
    it("maps workflow run node and defaults fields", () => {
      const wr = {
        id: "wr-1",
        type: "resolveIssue" as const,
        createdAt: dt,
        // state and postToGithub are optional
      }
      const result = makeQueryResult([
        makeRecord({
          wr: { properties: wr },
        }),
      ])

      const mapped = mapCreateWorkflowRunResult(result as any, { id: "wr-1", type: "resolveIssue" })

      expect(mapped).toEqual<WorkflowRun>({
        id: "wr-1",
        type: "resolveIssue",
        createdAt: now,
        postToGithub: false,
        state: "pending",
      })
    })
  })

  describe("mapListByUser", () => {
    it("maps records with optional issue/repo/commit", () => {
      const run = { id: "wr-2", type: "resolveIssue" as const, createdAt: dt }
      const user = { id: "user-1", username: "u" }
      const issue = { number: neo4j.int(42), repoFullName: "o/r" }
      const repo = { fullName: "o/r", owner: "o", name: "r" }
      const commit = { sha: "abc", message: "m" }
      const state = "running"

      const result = makeQueryResult([
        makeRecord({
          w: { properties: run },
          u: { properties: user },
          i: { properties: issue },
          r: { properties: repo },
          c: { properties: commit },
          state,
        }),
      ])

      const mapped = mapListByUser(result as any)

      expect(mapped).toHaveLength(1)
      expect(mapped[0]).toMatchObject({
        id: "wr-2",
        actor: { type: "user", userId: "user-1" },
        issue: { repoFullName: "o/r", number: 42 },
        repository: { fullName: "o/r" },
        commit: { sha: "abc", message: "m", repository: { fullName: "o/r" } },
        state: "running",
      })
      expect(mapped[0].createdAt).toEqual(now)
    })

    it("maps record without optional fields", () => {
      const run = { id: "wr-3", type: "resolveIssue" as const, createdAt: dt }
      const user = { id: "user-2" }
      const state = "completed"

      const result = makeQueryResult([
        makeRecord({
          w: { properties: run },
          u: { properties: user },
          i: null,
          r: null,
          c: null,
          state,
        }),
      ])

      const [mapped] = mapListByUser(result as any)
      expect(mapped).toMatchObject({ id: "wr-3", actor: { type: "user", userId: "user-2" }, state: "completed" })
      expect(mapped.issue).toBeUndefined()
      expect(mapped.repository).toBeUndefined()
      expect(mapped.commit).toBeUndefined()
    })
  })

  describe("mapListEvents", () => {
    function makeEventRecord(props: Record<string, unknown>) {
      return makeRecord({ e: { properties: props } })
    }

    it("maps workflow and message events", () => {
      const records = [
        // workflow.state
        makeEventRecord({ id: "1", type: "workflowState", createdAt: dt, state: "running" }),
        // status
        makeEventRecord({ id: "2", type: "status", createdAt: dt, content: "ok" }),
        // error
        makeEventRecord({ id: "3", type: "error", createdAt: dt, content: "bad" }),
        // systemPrompt
        makeEventRecord({ id: "4", type: "systemPrompt", createdAt: dt, content: "sp" }),
        // userMessage
        makeEventRecord({ id: "5", type: "userMessage", createdAt: dt, content: "um" }),
        // llmResponse
        makeEventRecord({ id: "6", type: "llmResponse", createdAt: dt, content: "am" }),
        // reasoning
        makeEventRecord({ id: "7", type: "reasoning", createdAt: dt, summary: "think" }),
        // toolCall
        makeEventRecord({ id: "8", type: "toolCall", createdAt: dt, toolName: "t", toolCallId: "id", args: "{}" }),
        // toolCallResult
        makeEventRecord({ id: "9", type: "toolCallResult", createdAt: dt, toolName: "t", toolCallId: "id", content: "res" }),
      ]

      const result = makeQueryResult(records)
      const mapped = mapListEvents(result as any)

      // Expect mapped events to have correct length and basic shapes
      expect(mapped).toHaveLength(records.length)

      // Spot check a few
      expect(mapped[0]).toEqual({ id: "1", timestamp: now, type: "workflow.state", state: "running" })
      expect(mapped[1]).toEqual({ id: "2", timestamp: now, type: "status", content: "ok" })
      expect(mapped[2]).toEqual({ id: "3", timestamp: now, type: "workflow.error", message: "bad" })
      expect(mapped[3]).toEqual({ type: "system_prompt", timestamp: now.toISOString(), content: "sp" })
      expect(mapped[6]).toEqual({ type: "reasoning", timestamp: now.toISOString(), content: "think" })
      expect(mapped[7]).toEqual({ type: "tool.call", timestamp: now.toISOString(), content: "t({})" })
      expect(mapped[8]).toEqual({ type: "tool.result", timestamp: now.toISOString(), content: "res" })
    })

    it("throws on unknown event types", () => {
      const bad = makeEventRecord({ id: "x", type: "reviewComment", createdAt: dt, content: "c" })
      const result = makeQueryResult([bad])
      expect(() => mapListEvents(result as any)).toThrow(/Unknown Neo4j event type/)
    })
  })

  describe("mapListForRepoResult", () => {
    it("maps user-initiated workflow runs", () => {
      const run = { id: "wr-4", type: "resolveIssue" as const, createdAt: dt }
      const repo = { fullName: "o/r", owner: "o", name: "r", githubInstallationId: "inst-1" }
      const issue = { number: neo4j.int(1), repoFullName: "o/r" }
      const commit = { sha: "abc", message: "m" }

      const result = makeQueryResult([
        makeRecord({
          w: { properties: run },
          userActor: { properties: { id: "user-1" } },
          webhookEvent: null,
          webhookSender: null,
          state: "pending",
          i: { properties: issue },
          r: { properties: repo },
          c: { properties: commit },
        }),
      ])

      const [mapped] = mapListForRepoResult(result as any)
      expect(mapped).toMatchObject({
        id: "wr-4",
        actor: { type: "user", userId: "user-1" },
        repository: { fullName: "o/r" },
        issue: { number: 1, repoFullName: "o/r" },
        commit: { sha: "abc", message: "m", repository: { fullName: "o/r" } },
        state: "pending",
      })
      expect(mapped.createdAt).toEqual(now)
    })

    it("maps webhook-triggered workflow runs and falls back on invalid state", () => {
      const run = { id: "wr-5", type: "resolveIssue" as const, createdAt: dt }
      const repo = { fullName: "o/r", owner: "o", name: "r", githubInstallationId: "inst-2" }
      const webhookEvent = { id: "evt-1", event: "issues" as const, action: "labeled" as const, labelName: "resolve", repoFullName: "o/r", issueNumber: neo4j.int(2), createdAt: dt }
      const sender = { id: "123", login: "octo" }

      const result = makeQueryResult([
        makeRecord({
          w: { properties: run },
          userActor: null,
          webhookEvent: { properties: webhookEvent },
          webhookSender: { properties: sender },
          state: "not-a-valid-state", // triggers fallback to "completed"
          i: null,
          r: { properties: repo },
          c: null,
        }),
      ])

      const [mapped] = mapListForRepoResult(result as any)
      expect(mapped.actor).toEqual({
        type: "webhook",
        source: "github",
        event: "issues",
        action: "labeled",
        sender: { id: "123", login: "octo" },
        installationId: "inst-2",
      })
      expect(mapped.state).toBe("completed")
    })
  })
})

