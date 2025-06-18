import { z } from "zod";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { createTool } from "@/lib/tools/helper";
import fs from "fs";

// Input schema
const fileCheckParameters = z.object({
  relativePath: z
    .string()
    .describe(
      "The relative path to the file you want to check for code quality. Only use for a single file."),
  cliOverride: z
    .string()
    .optional()
    .describe(
      "ONLY for rare system use; override the CLI QA check command. AGENT: Prefer default logic. Never use for shell-execution. This is for escalation, e.g., new QA tools not yet supported.")
});

// Output schema + instructions
const fileCheckResult = z.object({
  stdout: z.string().describe('Standard output from the code quality tool.'),
  stderr: z.string().describe('Standard error from the code quality tool.'),
  exitCode: z.number().describe('Process exit code. 0 = success.'),
}).describe(`
  This output gives the results of running a code quality CLI tool on the specified file.
  - Only use for QA tools (lint, typecheck, format), never for arbitrary shell commands.
  - Always include the file path in the command if supported.
  - If there is an error, analyze the error. If fixable, propose and retry.
  - Review project config to select the right tool: prefer lint (ESLint), then tsc, then prettier if available.
  - Never run commands that mutate code here; this tool is strictly for CHECKING.
  - All code quality errors/warnings should be included in stdout/stderr.
  - Return all output in plain UTF-8, no formatting or color sequences.
`);

const execPromise = promisify(exec);

async function handler(baseDir: string, params: z.infer<typeof fileCheckParameters>): Promise<string> {
  const { relativePath, cliOverride } = params;
  const filePath = path.join(baseDir, relativePath);
  if (!fs.existsSync(filePath) || !fs.lstatSync(filePath).isFile()) {
    return JSON.stringify({ stdout: "", stderr: `File not found: ${relativePath}", exitCode: 1 });
  }

  let command = "";
  try {
    // Prefer override, but sanitize string to reduce risk
    if (cliOverride) {
      command = cliOverride.replace(/[^a-zA-Z0-9-_.:/\\s]/g, "");
    } else {
      // Read package.json for scripts/tools
      const pkgPath = path.join(baseDir, "package.json");
      if (!fs.existsSync(pkgPath)) {
        return JSON.stringify({
          stdout: "",
          stderr: "No package.json found in project root. Cannot determine QA tools.",
          exitCode: 1
        });
      }

      const pkgData = fs.readFileSync(pkgPath, "utf8");
      const pkgJson = JSON.parse(pkgData);
      const scripts = pkgJson.scripts || {};
      let script = "";
      if ("lint" in scripts) script = "lint";
      else if ("lint:eslint" in scripts) script = "lint:eslint";
      else if ("lint:tsc" in scripts) script = "lint:tsc";
      else if ("lint:prettier" in scripts) script = "lint:prettier";
      else if ("check" in scripts) script = "check";

      // Find best fit command
      if (script) {
        // Only enable per-file checks for known tools/scripts
        if (script.includes("tsc")) {
          command = `pnpm ${script} -- ${relativePath}`;
        } else if (script.includes("eslint")) {
          command = `pnpm ${script} -- ${relativePath}`;
        } else if (script.includes("prettier")) {
          command = `pnpm ${script} --check ${relativePath}`;
        } else if (script.includes("lint") || script === "lint") {
          command = `pnpm ${script} ${relativePath}`;
        } else {
          // If script detected but not a known QA tool, error
          return JSON.stringify({
            stdout: "",
            stderr: `Detected script '${script}', but it does not match a recognized QA tool for per-file checking.",
            exitCode: -1
          });
        }
      } else {
        return JSON.stringify({
          stdout: "",
          stderr: "No code quality tool found. Please define a script for linting, type-checking, or formatting in package.json.",
          exitCode: 1,
        });
      }
    }

    const { stdout, stderr } = await execPromise(command, { cwd: baseDir, maxBuffer: 1024 * 1024 });
    return JSON.stringify({ stdout, stderr, exitCode: 0 });
  } catch (err: any) {
    return JSON.stringify({
      stdout: err.stdout || "",
      stderr: err.stderr || err.message || "Code quality check failed.",
      exitCode: typeof err.code === "number" ? err.code : 1,
    });
  }
}

export const createFileCheckTool = (baseDir: string) =>
  createTool({
    name: "file_check",
    description: `
      Executes the most appropriate code quality checker (e.g., linter, type checker, or formatter) on a single file.
      The agent MUST call this right after writing or editing a file.
      - Always consult project config first.
      - Only use for code quality checking, never arbitrary commands.
      - Only run on the single file; do not check the entire repo.
      If no checker tool is found (no script, config, or CLI), return a clear error in stderr.
    `,
    schema: fileCheckParameters,
    handler: (params: z.infer<typeof fileCheckParameters>) => handler(baseDir, params),
    resultSchema: fileCheckResult,
  });
