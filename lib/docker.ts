import { exec } from "child_process"
import util from "util"

const execPromise = util.promisify(exec)

export async function startDetachedContainer({
  image,
  hostDir,
  name,
  user = "1000:1000",
}: {
  image: string
  hostDir: string
  name: string
  user?: string
}): Promise<string> {
  const cmd = [
    "docker run -d",
    `--name ${name}`,
    `-u ${user}`,
    `-v \"${hostDir}:/workspace\"`,
    "-w /workspace",
    image,
    "tail -f /dev/null",
  ].join(" ")
  const { stdout } = await execPromise(cmd)
  return stdout.trim()
}

export async function execInContainer({
  name,
  command,
}: {
  name: string
  command: string
}): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const execCmd = `docker exec ${name} sh -c '${command.replace(/'/g, "'\\''")}'`
  try {
    const { stdout, stderr } = await execPromise(execCmd)
    return { stdout, stderr, exitCode: 0 }
  } catch (error: unknown) {
    const err = error as {
      stdout?: string
      stderr?: string
      code?: number
      message?: string
    }
    // child_process.exec provides stdout/stderr even on errors
    return {
      stdout: err.stdout || "",
      stderr: err.stderr || err.message || "",
      exitCode: typeof err.code === "number" ? err.code : 1,
    }
  }
}

export async function stopAndRemoveContainer(name: string): Promise<void> {
  try {
    await execPromise(`docker rm -f ${name}`)
  } catch (e) {
    console.warn(`[WARNING] Failed to stop/remove container ${name}:`, e)
  }
}
