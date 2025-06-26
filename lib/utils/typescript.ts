import { exec } from "child_process"
import { promisify } from "util"

const execPromise = promisify(exec)

/**
 * Runs TypeScript type checking in the given directory.
 * Returns null if the check passes, otherwise returns the error output.
 */
export async function runTypeCheck(dir: string): Promise<string | null> {
  try {
    await execPromise("pnpm lint:tsc", { cwd: dir })
    return null
  } catch (error: any) {
    const stdout = error?.stdout ?? ""
    const stderr = error?.stderr ?? ""
    return `${stdout}${stderr}`.trim() || error.message || String(error)
  }
}
