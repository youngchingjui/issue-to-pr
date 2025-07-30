// NOTE: This file contains legacy/deprecated type definitions that are still
// referenced by some parts of the codebase.  In most places we now rely on the
// Zod schemas and inferred types exported from `lib/types/index.ts` instead.
// For backwards-compatibility we keep a subset of the old definitions here.

import { WorkflowType } from "@/lib/types"

// --- Legacy WorkflowRunState -------------------------------------------------
// Keep in sync with `workflowRunStateSchema` in `lib/types/index.ts`.
export type WorkflowRunState = "running" | "completed" | "error" | "timedOut"

// The rest of the legacy types are intentionally omitted because they are no
// longer used by the application directly.  If you need other types that used
// to live here, import them from `lib/types` instead.

export type WorkflowRun = {
  id: string
  workflowType: WorkflowType
  created_at: Date
}

