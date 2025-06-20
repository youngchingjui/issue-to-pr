import { exec as execCallback } from "node:child_process"

import { promisify } from "util"
const execPromise = promisify(execCallback)

type SetupEnvOptions = {
  /**
   * Shell commands to prepare the repository (e.g. `pnpm i`, `python3 -m venv .venv && pip install -r requirements.txt`).
   * Can be a single string (with `&&` or new-lines) or an array of commands to run sequentially.
   */
  setupCommands?: string[] | string
  workflowId: string
  createStatusEvent: (event: {
    workflowId: string
    content: string
  }) => void | Promise<unknown>
  createErrorEvent: (event: {
    workflowId: string
    content: string
  }) => void | Promise<unknown>
  createWorkflowStateEvent: (event: {
    workflowId: string
    state: "running" | "completed" | "error"
    content: string
  }) => void | Promise<unknown>
}

/**
 * Sets up the environment after repo checkout, running install/setup commands.
 * @param baseDir - Path to project base dir
 * @param options - { setupCommands, workflowId, createStatusEvent, createErrorEvent, createWorkflowStateEvent }
 */
export async function setupEnv(
  baseDir: string,
  {
    setupCommands,
    workflowId,
    createStatusEvent,
    createErrorEvent,
    createWorkflowStateEvent,
  }: SetupEnvOptions
): Promise<void> {
  // Helper string -> array
  function normalizeCommands(cmd: string[] | string | undefined): string[] {
    if (!cmd) return []
    if (typeof cmd === "string") {
      // Try to split on newlines/semicolons if entered via textarea
      if (cmd.includes("\n"))
        return cmd
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean)
      if (cmd.includes(";"))
        return cmd
          .split(";")
          .map((x) => x.trim())
          .filter(Boolean)
      return [cmd.trim()]
    }
    return cmd.map((x) => x.trim()).filter(Boolean)
  }

  const normalizedSetupCmds = normalizeCommands(setupCommands)
  if (normalizedSetupCmds.length) {
    for (const cmd of normalizedSetupCmds) {
      await createStatusEvent({
        workflowId,
        content: `Running setup command: ${cmd}`,
      })
      try {
        await execPromise(cmd, { cwd: baseDir })
      } catch (err) {
        await createErrorEvent({
          workflowId,
          content: `Setup command failed: ${err}`,
        })
        await createWorkflowStateEvent({
          workflowId,
          state: "error",
          content: `Setup command failed: ${err}`,
        })
        throw new Error(`Setup command failed: ${err}`)
      }
    }
    return
  }

  // --- Fallback logic ---
  // TODO: Extract commands from LLM or Neo4j if not provided
  await createStatusEvent({
    workflowId,
    content:
      "No setup commands provided. (Empty.) Provide a shell command or configure one in repository settings.",
  })
}
