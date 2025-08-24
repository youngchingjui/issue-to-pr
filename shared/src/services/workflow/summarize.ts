import { z } from "zod"

import type { LLMPort } from "@/shared/src/core/ports/llm"
import type { WorkflowRunPort, WorkflowEvent } from "@/shared/src/core/ports/workflow"
import {
  ToolCallEvent,
  workflowRunSummarySchema,
  type WorkflowRunSummary,
} from "@/shared/src/core/entities/workflow"

// Internal schema used to validate/parse LLM output
const LLMOutputSchema = z.object({
  actionsSummary: z.string(),
  filesRead: z.array(z.string()).default([]),
  interestingFindings: z.array(z.string()).default([]),
})

function tryParseJSON<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T
  } catch {
    // Try to extract the first {...} JSON block
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0]) as T
      } catch {
        return null
      }
    }
    return null
  }
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr))
}

// Best-effort extraction of files read from toolCall args
function extractFilesRead(events: WorkflowEvent[]): string[] {
  const files: string[] = []
  for (const e of events) {
    if (e.type === "toolCall") {
      const call = e as ToolCallEvent
      let args: unknown
      try {
        args = JSON.parse(call.args)
      } catch {
        args = null
      }
      if (args && typeof args === "object") {
        const obj = args as Record<string, unknown>
        // Common parameter names used across existing tools
        const maybePath = obj["path"] ?? obj["file"] ?? obj["filePath"]
        if (typeof maybePath === "string") files.push(maybePath)
        // Some tools may accept multiple files
        const maybeFiles = obj["paths"] ?? obj["files"]
        if (Array.isArray(maybeFiles)) {
          for (const p of maybeFiles) if (typeof p === "string") files.push(p)
        }
        // Ripgrep may include a directory root; skip unless explicitly a file
      }
    }
  }
  return unique(files)
}

function eventsDigest(events: WorkflowEvent[], maxChars = 6000): string {
  // Create a compact textual digest of the run for the LLM
  const lines: string[] = []
  for (const e of events) {
    const ts = e.createdAt instanceof Date ? e.createdAt.toISOString() : ""
    switch (e.type) {
      case "systemPrompt":
      case "userMessage":
      case "llmResponse":
      case "reasoning":
      case "status":
      case "error":
      case "reviewComment":
      case "workflowState": {
        const content = (e.content ?? "").slice(0, 800)
        lines.push(`[${ts}] ${e.type}: ${content}`)
        break
      }
      case "toolCall": {
        const shortArgs = (e.args ?? "").slice(0, 400)
        lines.push(`[${ts}] toolCall: ${e.toolName} args=${shortArgs}`)
        break
      }
      case "toolCallResult": {
        const content = (e.content ?? "").slice(0, 800)
        lines.push(`[${ts}] toolCallResult: ${e.toolName} -> ${content}`)
        break
      }
    }
    // Truncate early if too long
    const joined = lines.join("\n")
    if (joined.length > maxChars) {
      return joined.slice(joined.length - maxChars) // keep tail
    }
  }
  return lines.join("\n")
}

const SYSTEM_PROMPT = `You are a precise log analyst. You will receive an ordered list of events from an agent workflow run (system prompts, user messages, reasoning, tool calls, tool results, statuses, errors).

Your job:
1) Summarize what the agent did at a high level (actionsSummary).
2) List which files it read (filesRead). Only include paths you are confident about.
3) Capture interesting findings about the codebase that materially impacted the final decision (interestingFindings).

Output JSON only, with keys: actionsSummary (string), filesRead (string[]), interestingFindings (string[]).`

export async function summarizeWorkflowRun({
  workflowRunId,
  llm,
  port,
  model,
  maxTokens = 800,
}: {
  workflowRunId: string
  llm: LLMPort
  port: WorkflowRunPort
  model?: string
  maxTokens?: number
}): Promise<WorkflowRunSummary> {
  const events = await port.getEvents(workflowRunId)

  const preExtractedFiles = extractFilesRead(events)
  const digest = eventsDigest(events)

  const userContent = [
    preExtractedFiles.length
      ? `Potential files read (pre-extracted):\n- ${preExtractedFiles.join("\n- ")}`
      : "Potential files read (pre-extracted): none",
    "\nEvent log:",
    digest,
  ].join("\n\n")

  const raw = await llm.createCompletion({
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
    model,
    maxTokens,
  })

  // Try to parse and validate LLM output
  const json = tryParseJSON<unknown>(raw)
  let parsed = json ? LLMOutputSchema.safeParse(json) : null

  let output: z.infer<typeof LLMOutputSchema>
  if (parsed?.success) {
    output = parsed.data
    // merge any extra files we pre-extracted
    output.filesRead = unique([...(output.filesRead ?? []), ...preExtractedFiles])
  } else {
    // Fallback: heuristic summary from events
    const statusLines = events
      .filter((e) => e.type === "status")
      .map((e) => e.content)
      .filter(Boolean)
      .slice(0, 5) as string[]

    output = {
      actionsSummary:
        statusLines.length > 0
          ? `Agent ran with notable statuses: ${statusLines.join(" | ")}`
          : "Agent executed a workflow run; see event log for details.",
      filesRead: preExtractedFiles,
      interestingFindings: [],
    }
  }

  // Final validation into public schema
  const final = workflowRunSummarySchema.parse({
    workflowRunId,
    actionsSummary: output.actionsSummary.trim(),
    filesRead: unique((output.filesRead ?? []).map((s) => s.trim()).filter(Boolean)),
    interestingFindings: unique(
      (output.interestingFindings ?? []).map((s) => s.trim()).filter(Boolean)
    ),
  })

  return final
}

export { workflowRunSummarySchema as WorkflowRunSummarySchema }

