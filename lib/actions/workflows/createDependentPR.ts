"use server"

import { makeSettingsReaderAdapter } from "shared/adapters/neo4j/repositories/SettingsReaderAdapter"
import { v4 as uuidv4 } from "uuid"

import { auth } from "@/auth"
import { neo4jDs } from "@/lib/neo4j"
import * as userRepo from "@/lib/neo4j/repositories/user"
import { createDependentPRWorkflow } from "@/lib/workflows/createDependentPR"

import {
  type CreateDependentPRRequest,
  createDependentPRRequestSchema,
  type CreateDependentPRResult,
} from "../schemas"

// Overload for typed usage
export async function createDependentPRAction(
  input: CreateDependentPRRequest
): Promise<CreateDependentPRResult>
// Accept unknown at boundary and validate
export async function createDependentPRAction(
  input: unknown
): Promise<CreateDependentPRResult>
export async function createDependentPRAction(
  input: unknown
): Promise<CreateDependentPRResult> {
  // Parse input
  const parsed = createDependentPRRequestSchema.safeParse(input)
  if (!parsed.success) {
    return {
      status: "error",
      code: "INVALID_INPUT",
      message: parsed.error.message,
    }
  }
  const { repoFullName, pullNumber, jobId } = parsed.data

  // Auth
  const session = await auth()
  if (!session) {
    return {
      status: "error",
      code: "AUTH_REQUIRED",
      message: "Authentication required",
    }
  }
  const login = session.profile?.login
  if (!login) {
    return {
      status: "error",
      code: "AUTH_REQUIRED",
      message: "Login not found",
    }
  }

  // Settings
  const settingsReader = makeSettingsReaderAdapter({
    getSession: () => neo4jDs.getSession(),
    userRepo: userRepo,
  })
  const apiKeyResult = await settingsReader.getOpenAIKey(login)
  if (!apiKeyResult.ok || !apiKeyResult.value) {
    return {
      status: "error",
      code: "MISSING_API_KEY",
      message:
        "LLM API key is not configured. Add your OpenAI API key in settings.",
    }
  }
  const apiKey = apiKeyResult.value

  // Kick off workflow
  const effectiveJobId = jobId || uuidv4()
  ;(async () => {
    try {
      await createDependentPRWorkflow({
        repoFullName,
        pullNumber,
        apiKey,
        jobId: effectiveJobId,
        initiator: { type: "ui_button", actorLogin: login },
      })
    } catch (e) {
      console.error("[create-dependent-pr] Background run failed:", e)
    }
  })()

  return { status: "success", jobId: effectiveJobId }
}

