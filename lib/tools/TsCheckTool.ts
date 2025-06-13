import { exec } from "child_process";
import { promisify } from "util";
import { z } from "zod";

import { createTool } from "@/lib/tools/helper";

const execPromise = promisify(exec);

const name = "ts_check";
const description = `Runs TypeScript type check (tsc --noEmit) on the repo. Returns stdout/stderr as string. Returns error status if 'tsc' is not installed or fails.`;

// No parameters for now; can add baseDir in future if needed
type TsCheckOutput = {
  ok: boolean;
  output: string;
};

const tsCheckParameters = z.object({}); // Empty for now; flexible for future

async function handler(params: {}): Promise<TsCheckOutput> {
  try {
    const { stdout, stderr } = await execPromise("tsc --noEmit");
    // TypeCheck errors show in stderr, but tsc's exit code is nonzero if there are type errors
    if (stderr && stderr.length > 0) {
      // This occurs if type errors or warnings
      return { ok: false, output: stderr };
    }
    return { ok: true, output: stdout };
  } catch (error: any) {
    if (error.code === "ENOENT" || /not found|not recognized|ENOENT/i.test(error.message)) {
      return { ok: false, output: "TypeScript (tsc) is not installed or not found in PATH." };
    }
    // If tsc ran but exited nonzero, return its output
    if (typeof error.stdout === "string" && typeof error.stderr === "string") {
      const msg = [error.stdout, error.stderr].filter(Boolean).join("\n");
      return { ok: false, output: msg || String(error) };
    }
    return { ok: false, output: String(error) };
  }
}

export const createTsCheckTool = () =>
  createTool({
    name,
    description,
    schema: tsCheckParameters,
    handler: handler,
  });
