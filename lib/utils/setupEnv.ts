import { exec as execCallback } from "node:child_process"

import { promisify } from "util"
const execPromise = promisify(execCallback)

/**
 * Normalize a string or array of shell commands into an array of trimmed commands.
 */
function normalizeCommands(cmd?: string[] | string): string[] {
  if (!cmd) return []
  if (typeof cmd === "string") {
    // Support splitting commands provided via textarea (new-lines or semicolons)
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

/**
 * Sets up the environment after repository checkout by running the provided shell commands.
 *
 * It purposely avoids any side-effects such as creating Neo4j events. Instead, it:
 *   • returns a confirmation message when the setup completes successfully.
 *   • throws an Error when any command fails so the caller can handle/report it.
 *
 * @param baseDir        Absolute path to the project directory where commands should be executed.
 * @param setupCommands  Shell command(s) to run. Can be a single string or an array.
 * @returns              A human-readable confirmation message on success.
 * @throws               If any command exits with a non-zero status or the spawn fails.
 */
export async function setupEnv(
  baseDir: string,
  setupCommands?: string[] | string
): Promise<string> {
  const commands = normalizeCommands(setupCommands)

  // Nothing to execute – simply return.
  if (!commands.length) {
    return "No setup commands provided – skipping environment setup."
  }

  const outputLogs: string[] = []

  for (const cmd of commands) {
    try {
      const { stdout, stderr } = await execPromise(cmd, { cwd: baseDir })

      // Capture outputs for the final result so the caller can surface them if desired.
      outputLogs.push(
        [`$ ${cmd}`, stdout?.trim(), stderr?.trim()].filter(Boolean).join("\n")
      )
    } catch (err: unknown) {
      // If exec fails we still want to surface stdout/stderr that may help debugging.
      const errorObj = err as {
        stdout?: string | Buffer
        stderr?: string | Buffer
      }
      const stdout = errorObj.stdout?.toString() ?? ""
      const stderr = errorObj.stderr?.toString() ?? ""
      const baseMessage = `Setup command failed (${cmd}): ${String(err)}`

      throw new Error(
        [baseMessage, stdout.trim(), stderr.trim()].filter(Boolean).join("\n")
      )
    }
  }

  // If there were no logs (e.g., commands produced no output), still return a confirmation message.
  return outputLogs.length
    ? outputLogs.join("\n")
    : "Environment setup completed successfully. (no output)"
}
