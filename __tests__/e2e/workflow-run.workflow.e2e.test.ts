/**
 * @jest-environment node
 */

import path from "path"
import fs from "fs"
import dotenv from "dotenv"
import { NextRequest, NextResponse } from "next/server"

import { POST as EnqueueJob } from "@/app/api/queues/[queueId]/jobs/route"
import { GET as ListWorkflowRuns } from "@/app/api/workflow-runs/route"
import { GET as GetWorkflowRunEvents } from "@/app/api/workflow-runs/[workflowId]/events/route"
import { getRedisConnection } from "@/adapters/ioredis/client"
import { n4j } from "@/lib/neo4j/client"

// Load optional per-test env file if present.
// Place secrets in __tests__/.env.workflow.e2e (not committed); see example file for keys.
const envPath = path.resolve(process.cwd(), "__tests__/.env.workflow.e2e")
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

// This E2E test triggers the end-to-end autoResolveIssue workflow by enqueueing
// a job into the BullMQ queue, then polls the Workflow Runs APIs to verify that
// events are persisted to the database and that the workflow completes.
//
// IMPORTANT:
// - Intended to be run manually via `pnpm test:e2e:workflow`.
// - Expects your local environment to be running just like `pnpm dev`:
//   - Redis
//   - Neo4j
//   - Workflow worker(s) consuming the BullMQ queue
//   - Proper GitHub App + OpenAI credentials in env
// - These tests are isolated under their own Jest project and do not run in CI.
//
// Required env vars for this test:
//   E2E_REPO_FULL_NAME=owner/repo
//   E2E_ISSUE_NUMBER=123
//   E2E_GITHUB_LOGIN=your-github-username (used for auth() mocking)
// Optional:
//   E2E_BRANCH=feature/e2e-test-branch

// Preflight: sanity-check core services and critical env. If something is missing,
// print a clear message and skip the test body.
async function preflight(): Promise<{ ok: boolean; reason?: string }> {
  const missing: string[] = []
  if (!process.env.E2E_REPO_FULL_NAME) missing.push("E2E_REPO_FULL_NAME")
  if (!process.env.E2E_ISSUE_NUMBER) missing.push("E2E_ISSUE_NUMBER")

  if (missing.length) {
    return {
      ok: false,
      reason: `Missing env: ${missing.join(", ")}. Create __tests__/.env.workflow.e2e (see __tests__/env.workflow.e2e.example).`,
    }
  }

  // Redis connectivity
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    return { ok: false, reason: "REDIS_URL is not set" }
  }
  try {
    const r = getRedisConnection(redisUrl, "general")
    await r.ping()
  } catch (e) {
    return { ok: false, reason: `Cannot connect to Redis at REDIS_URL: ${String(e)}` }
  }

  // Neo4j connectivity
  try {
    const healthy = await n4j.healthCheck()
    if (!healthy) return { ok: false, reason: "Neo4j health check failed" }
  } catch (e) {
    return { ok: false, reason: `Neo4j connectivity error: ${String(e)}` }
  }

  // Surface likely requirements for the worker runtime
  const advisoryMissing: string[] = []
  if (!process.env.GITHUB_APP_ID) advisoryMissing.push("GITHUB_APP_ID")
  if (!process.env.GITHUB_APP_PRIVATE_KEY_PATH) advisoryMissing.push("GITHUB_APP_PRIVATE_KEY_PATH")
  if (!process.env.OPENAI_API_KEY) advisoryMissing.push("OPENAI_API_KEY")
  if (advisoryMissing.length) {
    // Not a hard failure because some environments may inject alternates,
    // but warn prominently.
    // eslint-disable-next-line no-console
    console.warn(
      `[workflow-e2e] Advisory: missing ${advisoryMissing.join(", ")}. The worker may fail without these.`
    )
  }

  return { ok: true }
}

// Mock next-auth's auth() to provide a session with a GitHub profile login.
// We only mock the minimum needed by the enqueue API route.
jest.mock("@/auth", () => ({
  auth: jest.fn().mockResolvedValue({
    profile: { login: process.env.E2E_GITHUB_LOGIN || "test-user" },
    token: { access_token: "placeholder" },
  }),
}))

// Utility to create a minimal NextRequest-like object with JSON body support
function createJsonRequest(body: unknown): NextRequest {
  const req = {
    json: jest.fn().mockResolvedValue(body),
  }
  return req as unknown as NextRequest
}

// Utility to parse NextResponse JSON
async function getJson(res: NextResponse): Promise<any> {
  const text = await (res as any).text?.() // NextResponse in tests may not have json() helper
  try {
    return JSON.parse(text)
  } catch {
    // Fallback to using .json() if available
    // @ts-expect-error - in some environments, NextResponse has .json()
    if (typeof (res as any).json === "function") return await (res as any).json()
    throw new Error("Unable to parse response JSON")
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Poll helper: waits until predicate returns truthy or timeout occurs
async function waitFor<T>(
  fn: () => Promise<T>,
  predicate: (v: T) => boolean,
  opts: { intervalMs: number; timeoutMs: number }
) {
  const { intervalMs, timeoutMs } = opts
  const start = Date.now()
  while (true) {
    const value = await fn()
    if (predicate(value)) return value
    if (Date.now() - start > timeoutMs) {
      throw new Error("Timed out waiting for condition")
    }
    await sleep(intervalMs)
  }
}

// No env-flag gating; this suite only runs when invoked via its dedicated Jest project.
describe("Workflow lifecycle E2E", () => {
  it("launches autoResolveIssue via queue and observes completion + events", async () => {
    const pf = await preflight()
    if (!pf.ok) {
      // eslint-disable-next-line no-console
      console.warn(
        `\n[workflow-e2e] Skipping test. Preflight failed: ${pf.reason}\n` +
          "Ensure Redis, Neo4j, and the workflow worker are running.\n"
      )
      return
    }

    const repoFullName = process.env.E2E_REPO_FULL_NAME!
    const issueNumber = Number(process.env.E2E_ISSUE_NUMBER!)

    // Step 1: Enqueue the autoResolveIssue job via the API route
    const queueId = "workflow-jobs"

    const job = {
      name: "autoResolveIssue",
      data: {
        repoFullName,
        issueNumber,
        branch: process.env.E2E_BRANCH || undefined,
      },
    }

    const enqueueReq = createJsonRequest(job)
    const enqueueRes = await EnqueueJob(enqueueReq, { params: { queueId } })
    expect(enqueueRes.status).toBe(200)
    const enqueueJson = await getJson(enqueueRes)
    expect(enqueueJson.success).toBe(true)
    const jobId: string = enqueueJson.jobId
    expect(typeof jobId).toBe("string")

    // Step 2: Poll the Workflow Runs list API for this specific issue until a run appears
    // Build a NextRequest with query params: ?repo=...&issue=...
    // Note: The origin/port here are not used by the route handler; we only need a URL
    // object to provide searchParams via request.nextUrl.
    const listUrl = new URL("http://localhost:3000/api/workflow-runs")
    listUrl.searchParams.set("repo", repoFullName)
    listUrl.searchParams.set("issue", String(issueNumber))

    async function listRunsCall() {
      const req = {
        nextUrl: listUrl,
      } as unknown as NextRequest
      const res = await ListWorkflowRuns(req)
      const json = await getJson(res)
      return json.runs as Array<{ id: string; createdAt: string; state: string }>
    }

    const runs = await waitFor(
      listRunsCall,
      (arr) => Array.isArray(arr) && arr.length > 0,
      {
        intervalMs: 5000,
        timeoutMs: 5 * 60 * 1000, // up to 5 minutes to see a run appear
      }
    )

    // Pick the most recent run
    runs.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    const workflowRunId = runs[0]!.id
    expect(typeof workflowRunId).toBe("string")

    // Step 3: Poll events API until we observe workflow.completed
    async function fetchEvents() {
      const res = await GetWorkflowRunEvents({} as NextRequest, {
        params: { workflowId: workflowRunId },
      })
      const json = await getJson(res)
      const events = json.events as Array<{
        type: string
        content?: string
        timestamp?: string
      }>
      return events
    }

    const events = await waitFor(
      fetchEvents,
      (evts) => evts?.some((e) => e.type === "workflow.completed"),
      {
        intervalMs: 10000,
        timeoutMs: 20 * 60 * 1000, // wait up to 20 minutes for full completion
      }
    )

    expect(Array.isArray(events)).toBe(true)
    // Basic smoke check for persistence: ensure several event types were recorded
    const types = new Set(events.map((e) => e.type))
    expect(types.has("workflow.started")).toBe(true)
    expect(types.has("workflow.state")).toBe(true)
    expect(types.has("workflow.completed")).toBe(true)

    // Optional: Log the final status event to assist manual verification
    const statusMessages = events
      .filter((e) => e.type === "status")
      .map((e) => e.content)
    // eslint-disable-next-line no-console
    console.log("Workflow status updates:", statusMessages)

    // NOTE: Verifying a created PR is intentionally not asserted strictly here to
    // avoid flakiness across environments, but the workflow is designed to create
    // a PR. You can manually verify on GitHub after the run completes.
  })
})

