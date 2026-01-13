// CLI and shell utilities - command-line interface helpers

import { exec as execCallback } from "node:child_process"

import { promisify } from "util"
const execPromise = promisify(execCallback)
import { execInContainerWithDockerode } from "@/shared/lib/docker"
import { asRepoEnvironment, type RepoEnvironment } from "@/shared/lib/types"

/**
 * Safe quoting helper for POSIX shells.
 *
 * Why this exists
 * ----------------
 * Any time we interpolate arbitrary text into a shell command we risk the text
 * being interpreted as shell syntax – `$HOME`, `$(...)`, `;`, `&&`, etc.  The
 * standard, portable defence is to wrap the text in single-quotes *and* to
 * escape any embedded single-quotes with the classic `'\''` dance.  This
 * converts the input into a literal byte sequence as far as the shell is
 * concerned.
 *
 * Algorithm
 * ---------
 * 1. Surround the whole string with single-quotes: `' ... '`.  Inside single
 *    quotes the shell performs **no** interpolation or expansion.
 * 2. Replace every single quote inside the original string with the three-step
 *    sequence `'\'\''`:
 *       – close the current quote (')
 *       – emit an escaped single-quote (\')
 *       – reopen the quote (')
 *
 *    In code: `str.replace(/'/g, "'\\''")`.
 * 3. Concatenate the opening quote, transformed text, and closing quote.
 *
 * Practical examples
 * ------------------
 * shellEscape("Hello World")          -> `'Hello World'`
 * shellEscape("O'Reilly")             -> `'O'\''Reilly'`
 * shellEscape("rm -rf /; echo $HOME") -> `'rm -rf /; echo $HOME'`
 * shellEscape("$(touch HACKED).txt")  -> `'$(touch HACKED).txt'`
 *
 * Edge cases
 * ----------
 * • Empty string → `''` (still safe)
 * • Multi-line strings are preserved; newlines are not special inside quotes.
 * • Very large inputs still work but may exceed OS command-line length limits –
 *   in that case prefer piping via stdin.
 *
 * Use this helper whenever you build a shell command from external or variable
 * data (e.g. inside Docker exec calls, printf > file redirections, etc.).
 */
export function shellEscape(str: string): string {
  return "'" + str.replace(/'/g, "'\\''") + "'"
}

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
 * @param env            Either a RepoEnvironment or absolute path to the project directory.
 * @param setupCommands  Shell command(s) to run. Can be a single string or an array.
 * @returns              A human-readable confirmation message on success.
 * @throws               If any command exits with a non-zero status or the spawn fails.
 */
// Overloaded function signatures for backwards compatibility
/**
 * @deprecated Use dockerized version with `env: RepoEnvironment` params instead
 */
export function setupEnv(
  baseDir: string,
  setupCommands?: string[] | string
): Promise<string>
export function setupEnv(
  env: RepoEnvironment,
  setupCommands?: string[] | string
): Promise<string>
export async function setupEnv(
  arg: string | RepoEnvironment,
  setupCommands?: string[] | string
): Promise<string> {
  const env = asRepoEnvironment(arg)
  const commands = normalizeCommands(setupCommands)

  // Nothing to execute – simply return.
  if (!commands.length) {
    return "No setup commands provided – skipping environment setup."
  }

  const outputLogs: string[] = []

  for (const cmd of commands) {
    try {
      if (env.kind === "host") {
        const { stdout, stderr } = await execPromise(cmd, { cwd: env.root })
        outputLogs.push(
          [`$ ${cmd}`, stdout?.trim(), stderr?.trim()]
            .filter(Boolean)
            .join("\n")
        )
      } else {
        const { stdout, stderr } = await execInContainerWithDockerode({
          name: env.name,
          command: cmd,
        })
        outputLogs.push(
          [`$ ${cmd}`, stdout.trim(), stderr.trim()].filter(Boolean).join("\n")
        )
      }
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
