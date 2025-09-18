/**
 * Port for running the Auto-Resolve workflow agent.
 *
 * App layer should provide an implementation that encapsulates
 * environment provisioning (containers/host), repository setup,
 * and calls to concrete agent(s).
 */
export interface AutoResolveAgentPort<ResultT = unknown> {
  /**
   * Run the auto-resolve agent for a given issue.
   *
   * The implementation is responsible for any heavy lifting
   * (setting up workspace, reading comments/tree, etc.).
   */
  run(params: {
    apiKey: string
    repoFullName: string
    issueNumber: number
    /** Optional working branch to use. */
    branch?: string
    /** Optional workflow id for correlating emitted events. */
    workflowId?: string
  }): Promise<ResultT>
}

export type { AutoResolveAgentPort as default }

