import { exec } from "child_process"
import util from "util"

const execPromise = util.promisify(exec)

export interface StartDetachedContainerOptions {
  image: string
  name: string
  /** UID:GID string; default keeps container non-root */
  user?: string
  /** Bind-mounts */
  mounts?: Array<{
    hostPath: string
    containerPath: string
    readOnly?: boolean
  }>
  /** Working directory inside the container */
  workdir?: string
}

export async function startDetachedContainer({
  image,
  name,
  user = "1000:1000",
  mounts = [],
  workdir,
}: StartDetachedContainerOptions): Promise<string> {
  // 1. Build volume flags: -v "host:container[:ro]"
  const volumeFlags = mounts.map(({ hostPath, containerPath, readOnly }) => {
    const ro = readOnly ? ":ro" : ""
    return `-v \"${hostPath}:${containerPath}${ro}\"`
  })

  // 2. Determine working directory
  const wdPath = workdir ?? (mounts.length ? mounts[0].containerPath : "/")
  const wdFlag = wdPath ? `-w \"${wdPath}\"` : undefined

  // 3. Assemble command parts and filter out undefined entries
  const cmd = [
    "docker run -d",
    `--name ${name}`,
    `-u ${user}`,
    ...volumeFlags,
    wdFlag,
    image,
    "tail -f /dev/null",
  ]
    .filter(Boolean)
    .join(" ")

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
