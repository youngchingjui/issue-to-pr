import util from "util"
import { exec } from "child_process"

/**
 * Top-level command used for TS check. Will be made configurable in future.
 */
export const PNPM_TSC_COMMAND = "pnpm lint:tsc"

const execPromise = util.promisify(exec)

/**
 * Runs the TypeScript check command (default: pnpm lint:tsc).
 * Returns structured result indicating success or failure.
 */
export async function runTsCheck(): Promise<
  | { pass: true; output: string }
  | { pass: false; error: string; output?: string }
> {
  try {
    const { stdout } = await execPromise(PNPM_TSC_COMMAND)
    return { pass: true, output: stdout }
  } catch (err: any) {
    // Defensive parsing of error
    let errorMsg = "Unknown error"
    let output = undefined
    if (err.stderr) errorMsg = err.stderr
    else if (err.message) errorMsg = err.message
    if (err.stdout) output = err.stdout
    return { pass: false, error: errorMsg, ...(output ? { output } : {}) }
  }
}
