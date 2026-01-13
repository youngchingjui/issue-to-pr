import { exec } from "child_process"
import util from "util"

/**
 * Top-level command used for TS check. Will be made configurable in future.
 */
export const PNPM_TSC_COMMAND = "pnpm lint:tsc"

const execPromise = util.promisify(exec)

/**
 * Runs the TypeScript check command (default: pnpm lint:tsc).
 * Returns structured result indicating success or failure.
 */
export async function runTsCheck(
  filePath: string
): Promise<
  | { pass: true; output: string }
  | { pass: false; error: string; output?: string }
> {
  // Ensure the provided path is absolute to avoid accidental relative lookups
  const path = await import("path")
  if (!path.isAbsolute(filePath)) {
    throw new Error(
      "runTsCheck expected an absolute file path. Received relative path."
    )
  }

  const cmd = `npx tsc --noEmit "${filePath}"`

  try {
    const { stdout } = await execPromise(cmd)
    return { pass: true, output: stdout }
  } catch (err: unknown) {
    const errorObj = err as {
      stderr?: string
      stdout?: string
      message?: string
    }
    const errorMsg = errorObj.stderr || errorObj.message || "Unknown error"
    const out = errorObj.stdout
    return { pass: false, error: errorMsg, ...(out ? { output: out } : {}) }
  }
}
