import { runInRepoContainer } from "@/lib/dockerExec"

export const PNPM_TSC_COMMAND = "pnpm lint:tsc"

/**
 * Runs the TypeScript check command (now in Docker container for this repo).
 * Returns structured result indicating success or failure.
 */
export async function runTsCheck(
  filePath: string
): Promise<
  | { pass: true; output: string }
  | { pass: false; error: string; output?: string }
> {
  // Ensure the provided path is absolute to avoid accidental relative lookups
  if (!(await import("path")).default.isAbsolute(filePath)) {
    throw new Error(
      "runTsCheck expected an absolute file path. Received relative path."
    )
  }
  // Deduce repoFullName
  const pathMod = (await import("path")).default
  const parts = filePath.split(pathMod.sep).filter(Boolean)
  const repoFullName = parts.slice(-3, -1).join("/")
  const projectCwd = parts.slice(0, -1).join("/")
  const cmd = `npx tsc --noEmit \"${filePath}\"`
  const { stdout, stderr, code } = await runInRepoContainer(repoFullName, cmd, {
    cwd: projectCwd,
  })
  if (code === 0) {
    return { pass: true, output: stdout }
  }
  return { pass: false, error: stderr || "Unknown error", output: stdout }
}
