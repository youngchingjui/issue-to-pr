export type WorkflowState = "pending" | "running" | "completed" | "error"

export interface WorkflowReporter {
  /**
   * Called once at the beginning of a workflow run. The implementation
   * may persist a workflow state event and/or stream to clients.
   */
  start(message?: string): Promise<void>

  /**
   * General status update. Prefer short, human-readable messages.
   */
  status(message: string): Promise<void>

  /**
   * Informational message that doesn't represent a step transition.
   */
  info(message: string): Promise<void>

  /**
   * Warning message that doesn't fail the workflow but signals degraded path.
   */
  warn(message: string): Promise<void>

  /**
   * Finalize the workflow as successfully completed.
   */
  complete(message?: string): Promise<void>

  /**
   * Record an error and mark the workflow as failed.
   */
  error(message: string): Promise<void>

  /**
   * Create a scoped reporter that prefixes messages with the given scope.
   * Useful to nest steps such as "branch-generation", "env-setup", etc.
   */
  child(scope: string): WorkflowReporter
}

/**
 * No-op reporter for tests or CLI usage where event persistence/streaming
 * is not required. This keeps the use case pure and easy to unit-test.
 */
export class NoopWorkflowReporter implements WorkflowReporter {
  start = async () => {}
  status = async () => {}
  info = async () => {}
  warn = async () => {}
  complete = async () => {}
  error = async () => {}
  child = (_scope: string) => this
}

