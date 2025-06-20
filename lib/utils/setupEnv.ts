import { runInRepoContainer } from "@/lib/dockerExec"

function normalizeCommands(cmd?: string[] | string): string[] {
  if (!cmd) return []
  if (typeof cmd === "string") {
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
 * Sets up the environment after repository checkout by running the provided shell commands (now in Docker).
 * Returns confirmation message or throws an Error on failure.
 * @param baseDir Path to repo dir (should map to /workspace in container for this repo)
 * @param setupCommands Shell command(s) to run, single or array
 */
export async function setupEnv(
  baseDir: string,
  setupCommands?: string[] | string
): Promise<string> {
  const commands = normalizeCommands(setupCommands)
  if (!commands.length) {
    return "No setup commands provided – skipping environment setup."
  }
  const outputLogs: string[] = []
  // Deduce repo name
  const repoFullName = (() => {
    const p = baseDir.split(require("path").sep).filter(Boolean)
    return p.slice(-2).join("/")
  })()
  for (const cmd of commands) {
    try {
      const { stdout, stderr, code } = await runInRepoContainer(
        repoFullName,
        cmd,
        { cwd: "." }
      )
      outputLogs.push(
        [`$ ${cmd}`, stdout?.trim(), stderr?.trim()].filter(Boolean).join("\n")
      )
      if (code !== 0) throw new Error(stderr || `Setup command failed (${cmd})`)
    } catch (err: any) {
      const stdout = err?.stdout?.toString?.() ?? ""
      const stderr = err?.stderr?.toString?.() ?? ""
      const baseMessage = `Setup command failed (${cmd}): ${String(err)}`
      throw new Error(
        [baseMessage, stdout.trim(), stderr.trim()].filter(Boolean).join("\n")
      )
    }
  }
  return outputLogs.length
    ? outputLogs.join("\n")
    : "Environment setup completed successfully. (no output)"
}
