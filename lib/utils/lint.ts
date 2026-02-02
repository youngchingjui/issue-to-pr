import { execSync } from "child_process";

export type LintResult =
  | { status: "OK"; output: string }
  | { status: "ERROR"; output: string; error: string };

/**
 * Runs the linter command synchronously ("pnpm run lint" by default).
 * Will be made configurable in the future.
 * Returns { status: "OK", output } on success,
 * or { status: "ERROR", output, error } on failure.
 */
export function runLint(): LintResult {
  try {
    // The lint command may be overridden in the future for configurability
    const output = execSync("pnpm run lint", { encoding: "utf-8" });
    return { status: "OK", output };
  } catch (err: any) {
    return {
      status: "ERROR",
      output: err.stdout?.toString?.() ?? "",
      error: err.stderr?.toString?.() ?? err.message,
    };
  }
}
