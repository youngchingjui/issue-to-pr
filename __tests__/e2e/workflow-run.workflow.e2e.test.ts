/**
 * @jest-environment node
 */

import { NextRequest, NextResponse } from "next/server"

import { POST as EnqueueJob } from "@/app/api/queues/[queueId]/jobs/route"
import { GET as ListWorkflowRuns } from "@/app/api/workflow-runs/route"
import { GET as GetWorkflowRunEvents } from "@/app/api/workflow-runs/[workflowId]/events/route"

// This E2E test triggers the end-to-end autoResolveIssue workflow by enqueueing
// a job into the BullMQ queue, then polls the Workflow Runs APIs to verify that
// events are persisted to the database and that the workflow completes.
//
// IMPORTANT:
// - This test is intended to be run manually. It will be skipped unless
//   RUN_WORKFLOW_E2E === "true".
// - It expects your local environment to be running just like `pnpm dev`:
//   - Redis
//   - Neo4j
//   - Next.js app (for API environment/auth resolution)
//   - Workflow worker(s) consuming the BullMQ queue
//   - Proper GitHub App + OpenAI credentials in env
//
// Required env vars for this test:
//   RUN_WORKFLOW_E2E=true
//   E2E_REPO_FULL_NAME=owner/repo
//   E2E_ISSUE_NUMBER=123
//   E2E_GITHUB_LOGIN=your-github-username (used for auth() mocking)
//
// Optional:
//   E2E_BRANCH=feature/e2e-test-branch

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
    if (typeof res.json === "function") return await res.json()
    throw new Error("Unable to parse response JSON")
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Poll helper: waits until predicate returns truthy or timeout occurs
async function waitFor<T>(fn: () => Promise<T>, predicate: (v: T) => boolean, opts: { intervalMs: number; timeoutMs: number }) {
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

const shouldRun = process.env.RUN_WORKFLOW_E2E === "true"

;(shouldRun ? describe : describe.skip)("Workflow lifecycle E2E", () => {
  it("launches autoResolveIssue via queue and observes completion + events", async () => {
    const repoFullName = process.env.E2E_REPO_FULL_NAME
    const issueNumberStr = process.env.E2E_ISSUE_NUMBER

    if (!repoFullName || !issueNumberStr) {
      throw new Error(
        "E2E_REPO_FULL_NAME and E2E_ISSUE_NUMBER must be set to run this test"
      )
    }
    const issueNumber = Number(issueNumberStr)

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
    const listUrl = new URL("http://localhost/api/workflow-runs")
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

    const runs = await waitFor(listRunsCall, (arr) => Array.isArray(arr) && arr.length > 0, {
      intervalMs: 5000,
      timeoutMs: 5 * 60 * 1000, // up to 5 minutes to see a run appear
    })

    // Pick the most recent run
    runs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    const workflowRunId = runs[0]!.id
    expect(typeof workflowRunId).toBe("string")

    // Step 3: Poll events API until we observe workflow.completed
    async function fetchEvents() {
      const res = await GetWorkflowRunEvents({} as NextRequest, { params: { workflowId: workflowRunId } })
      const json = await getJson(res)
      const events = json.events as Array<{ type: string; content?: string; timestamp?: string }>
      return events
    }

    const events = await waitFor(fetchEvents, (evts) => evts?.some((e) => e.type === "workflow.completed"), {
      intervalMs: 10000,
      timeoutMs: 20 * 60 * 1000, // wait up to 20 minutes for full completion
    })

    expect(Array.isArray(events)).toBe(true)
    // Basic smoke check for persistence: ensure several event types were recorded
    const types = new Set(events.map((e) => e.type))
    expect(types.has("workflow.started")).toBe(true)
    expect(types.has("workflow.state")).toBe(true)
    expect(types.has("workflow.completed")).toBe(true)

    // Optional: Log the final status event to assist manual verification
    const statusMessages = events.filter((e) => e.type === "status").map((e) => e.content)
    // eslint-disable-next-line no-console
    console.log("Workflow status updates:", statusMessages)

    // NOTE: Verifying a created PR is intentionally not asserted strictly here to
    // avoid flakiness across environments, but the workflow is designed to create
    // a PR. You can manually verify on GitHub after the run completes.
  })
})

