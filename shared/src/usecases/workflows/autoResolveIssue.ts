import { err, ok, type Result } from "@shared/entities/result"
import type { AuthReaderPort } from "@shared/ports/auth/reader"
import type { EventBusPort } from "@shared/ports/events/eventBus"
import { createWorkflowEventPublisher } from "@shared/ports/events/publisher"
import type { SettingsReaderPort } from "@shared/ports/repositories/settings.reader"
import type { AutoResolveAgentPort } from "@shared/ports/agents/autoResolve"

export interface AutoResolveIssueParams {
  /** Repository full name (e.g., "owner/repo") */
  repoFullName: string
  /** Issue number */
  issueNumber: number
  /** Optional explicit working branch */
  branch?: string
  /** Optional workflow id for emitting events */
  workflowId?: string
}

export type AutoResolveIssueErrorCode =
  | "AUTH_REQUIRED"
  | "MISSING_API_KEY"
  | "AGENT_ERROR"
  | "UNKNOWN"

export interface AutoResolveIssueOk<ResultT = unknown> {
  /** Optional workflow id, useful for correlating events */
  workflowId?: string
  /** Result returned by the underlying agent */
  result: ResultT
}

export async function autoResolveIssue<ResultT = unknown>(
  ports: {
    auth: AuthReaderPort
    settings: SettingsReaderPort
    agent: AutoResolveAgentPort<ResultT>
    eventBus?: EventBusPort
  },
  params: AutoResolveIssueParams
): Promise<
  Result<AutoResolveIssueOk<ResultT>, AutoResolveIssueErrorCode, undefined>
> {
  const { auth, settings, eventBus, agent } = ports
  const pub = createWorkflowEventPublisher(eventBus, params.workflowId)

  try {
    pub.workflow.started(
      `Auto-resolve workflow for #${params.issueNumber} in ${params.repoFullName}`
    )

    // 1) Authentication
    const authResult = await auth.getAuth()
    if (!authResult.ok) {
      pub.workflow.error("Authentication required")
      return err("AUTH_REQUIRED")
    }

    const { user: login } = authResult.value

    // 2) Resolve API key
    const apiKeyResult = await settings.getOpenAIKey(login.githubLogin)
    if (!apiKeyResult.ok || !apiKeyResult.value) {
      pub.workflow.error("Missing OpenAI API key")
      return err("MISSING_API_KEY")
    }

    // 3) Execute agent
    try {
      pub.status("Starting auto-resolve agent")
      const result = await agent.run({
        apiKey: apiKeyResult.value,
        repoFullName: params.repoFullName,
        issueNumber: params.issueNumber,
        branch: params.branch,
        workflowId: params.workflowId,
      })

      pub.workflow.completed("Auto-resolve workflow completed")
      return ok({ workflowId: params.workflowId, result })
    } catch {
      pub.workflow.error("Auto-resolve agent failed")
      return err("AGENT_ERROR")
    }
  } catch {
    pub.workflow.error("Unknown error occurred in auto-resolve workflow")
    return err("UNKNOWN")
  }
}

