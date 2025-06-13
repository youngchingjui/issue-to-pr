import { exec } from "child_process"
import { promisify } from "util"
import { z } from "zod"

import { createTool } from "@/lib/tools/helper"

const execPromise = promisify(exec)

const name = "ts_check"

type TsCheckOutput = {
  ok: boolean
  output: string
}

// Accept baseDir as a parameter for the tool factory
const tsCheckParameters = z.object({}) // Empty for now; flexible for future

// Handler now accepts baseDir and runs tsc in that directory
function createTsCheckTool(baseDir: string) {
  async function handler(params: object): Promise<TsCheckOutput> {
    try {
      const { stdout, stderr } = await execPromise("tsc --noEmit", {
        cwd: baseDir,
      })
      // TypeCheck errors show in stderr, but tsc's exit code is nonzero if there are type errors
      if (stderr && stderr.length > 0) {
        // This occurs if type errors or warnings
        return { ok: false, output: stderr }
      }
      return { ok: true, output: stdout }
    } catch (error: unknown) {
      if (!error) {
        throw new Error("Unknown error")
      }

      if (typeof error === "object") {
        if (
          "code" in error &&
          (error.code === "ENOENT" ||
            /not found|not recognized|ENOENT/i.test(String(error)))
        ) {
          return {
            ok: false,
            output: "TypeScript (tsc) is not installed or not found in PATH.",
          }
        }

        if ("stdout" in error && "stderr" in error) {
          const msg = [error.stdout, error.stderr].filter(Boolean).join("\n")
          return { ok: false, output: msg || String(error) }
        }
      }

      return { ok: false, output: String(error) }
    }
  }

  return createTool({
    name,
    description: `Runs TypeScript type check (tsc --noEmit) on the repo. Returns stdout/stderr as string. Returns error status if 'tsc' is not installed or fails.\n\nThis tool should be used after the agent has written their files. If they receive any errors, they should first reflect on why there are errors before making a fix.`,
    schema: tsCheckParameters,
    handler: handler,
  })
}

export { createTsCheckTool }
