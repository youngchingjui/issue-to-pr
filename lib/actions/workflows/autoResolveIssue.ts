"use server"

import { v4 as uuidv4 } from "uuid"

import { nextAuthReader } from "@/lib/adapters/auth/AuthReader"
import { getRepoFromString } from "@/lib/github/content"
import { getIssue } from "@/lib/github/issues"
import { neo4jDs } from "@/lib/neo4j"
import * as userRepo from "@/lib/neo4j/repositories/user"
import { autoResolveIssue } from "@/lib/workflows/autoResolveIssue"
import { EventBusAdapter } from "@/shared/src/adapters/ioredis/EventBusAdapter"
import { makeSettingsReaderAdapter } from "@/shared/src/adapters/neo4j/repositories/SettingsReaderAdapter"

import {
  type AutoResolveIssueRequest,
  autoResolveIssueRequestSchema,
  type AutoResolveIssueResult,
} from "../schemas"

// Overload for typed usage
export async function autoResolveIssueAction(
  input: AutoResolveIssueRequest
): Promise<AutoResolveIssueResult>
// Accept unknown at boundary and validate
export async function autoResolveIssueAction(
  input: unknown
): Promise<AutoResolveIssueResult>
export async function autoResolveIssueAction(
  input: unknown
): Promise<AutoResolveIssueResult> {
  try {
    // =================================================
    // Step 1: Parse inputs
    // =================================================
    const parsed = autoResolveIssueRequestSchema.safeParse(input)
    if (!parsed.success) {
      return {
        status: "error",
        code: "INVALID_INPUT",
        message: parsed.error.message,
      }
    }
    const { issueNumber, repoFullName, branch, jobId } = parsed.data

    const effectiveJobId = jobId || uuidv4()

    const redisUrl = process.env.REDIS_URL

    // =================================================
    // Step 2: Prepare adapters
    // =================================================
    const settingsAdapter = makeSettingsReaderAdapter({
      getSession: () => neo4jDs.getSession(),
      userRepo: userRepo,
    })

    const authAdapter = nextAuthReader

    const eventBus = redisUrl ? new EventBusAdapter(redisUrl) : undefined

    // =================================================
    // Step 3: Launch the background job (fire-and-forget)
    // =================================================

    ;(async () => {
      try {
        const repo = await getRepoFromString(repoFullName)
        const issueResult = await getIssue({
          fullName: repoFullName,
          issueNumber,
        })

        if (issueResult.type !== "success") {
          throw new Error(JSON.stringify(issueResult))
        }

        await autoResolveIssue(
          {
            issue: issueResult.issue,
            repository: repo,
            jobId: effectiveJobId,
            branch,
          },
          {
            auth: authAdapter,
            settings: settingsAdapter,
            eventBus: eventBus,
          }
        )
      } catch (error) {
        console.error("[autoResolveIssueAction] background run failed:", error)
      }
    })()

    // =================================================
    // Step 4: Return the job ID
    // =================================================

    return { status: "success", jobId: effectiveJobId }
  } catch (error) {
    console.error("[autoResolveIssueAction] Error:", error)
    return {
      status: "error",
      code: "UNKNOWN",
      message: "Failed to process request",
    }
  }
}

