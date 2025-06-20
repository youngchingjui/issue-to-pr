import { exec as execCallback } from "node:child_process"

import { promisify } from "util"
const execPromise = promisify(execCallback)

type SetupEnvOptions = {
  environment?: string
  setupCommands?: string[] | string
  installCommand?: string
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
 * @param options - { environment, setupCommands, installCommand, workflowId, createStatusEvent, createErrorEvent, createWorkflowStateEvent }
 */
export async function setupEnv(
  baseDir: string,
  {
    environment,
    setupCommands,
    installCommand,
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

  // Python environment logic
  if (environment === "python") {
    const fs = await import("fs/promises")
    const path = await import("path")
    const PYTHON_VENV_NAME = ".venv"
    const venvDir = path.join(baseDir, PYTHON_VENV_NAME)
    // Check if venv exists
    let venvExists = false
    try {
      await fs.access(venvDir)
      venvExists = true
    } catch {}
    if (!venvExists) {
      await createStatusEvent({
        workflowId,
        content: `No virtual environment found. Creating one at ${venvDir}`,
      })
      try {
        await execPromise(`python3 -m venv ${PYTHON_VENV_NAME}`, {
          cwd: baseDir,
        })
      } catch (err) {
        await createErrorEvent({
          workflowId,
          content: `Failed to create virtual environment: ${err}`,
        })
        await createWorkflowStateEvent({
          workflowId,
          state: "error",
          content: `Virtual environment creation failed: ${err}`,
        })
        throw new Error("Virtual environment creation failed")
      }
    }
    // install command: arg overrides setupCommands, then fallback to default
    let command = installCommand
    const normalizedSetupCmds = normalizeCommands(setupCommands)
    if (!command && normalizedSetupCmds.length) command = normalizedSetupCmds[0]
    if (!command) command = `${venvDir}/bin/pip install -r requirements.txt`
    await createStatusEvent({
      workflowId,
      content: `Detected Python environment. Running install command: ${command}`,
    })
    try {
      await execPromise(command, { cwd: baseDir })
    } catch (err) {
      await createErrorEvent({
        workflowId,
        content: `Install command failed: ${err}`,
      })
      await createWorkflowStateEvent({
        workflowId,
        state: "error",
        content: `Dependency install failed: ${err}`,
      })
      throw new Error("Dependency installation failed")
    }
    return
  }

  // Else: generic setup commands (typescript or custom)
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
      "No setup commands provided. (Environment not set or empty.) TODO: Auto-detect using LLM or database in future.",
  })
}
