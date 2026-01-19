/**
 * Helper to spawn and manage the workflow worker process for E2E tests.
 *
 * The worker is spawned as a child process with E2E-specific environment variables,
 * including queue isolation via BULLMQ_QUEUE_NAME.
 */
import type { ChildProcess } from "child_process"
import { spawn } from "child_process"
import path from "path"

export interface WorkerProcessHandle {
  process: ChildProcess
  kill: () => Promise<void>
}

export interface StartWorkerOptions {
  /** Environment variables to pass to the worker */
  env: Record<string, string>
  /** Path to the project root (defaults to process.cwd()) */
  projectRoot?: string
  /** Timeout in ms to wait for worker to be ready (default: 30000) */
  readyTimeout?: number
}

/**
 * Spawns the workflow worker process and waits for it to be ready.
 *
 * @returns A handle to the worker process with a kill() method for cleanup
 */
export async function startWorker(
  options: StartWorkerOptions
): Promise<WorkerProcessHandle> {
  const { env, projectRoot = process.cwd(), readyTimeout = 30000 } = options

  const workerDir = path.join(projectRoot, "apps/workers/workflow-workers")

  // Merge environment: inherit from current process but override with test-specific vars
  const workerEnv = {
    ...process.env,
    ...env,
    // Force color output in case the test runner strips it
    FORCE_COLOR: "1",
  }

  // Spawn the worker using tsx watch (same as pnpm dev:workflow-workers)
  const workerProcess = spawn("pnpm", ["exec", "tsx", "src/index.ts"], {
    cwd: workerDir,
    env: workerEnv,
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
  })

  // Collect output for debugging
  let stdout = ""
  let stderr = ""

  workerProcess.stdout?.on("data", (data: Buffer) => {
    const text = data.toString()
    stdout += text
    // Log worker output prefixed for clarity
    console.log(`[Worker stdout] ${text.trim()}`)
  })

  workerProcess.stderr?.on("data", (data: Buffer) => {
    const text = data.toString()
    stderr += text
    console.error(`[Worker stderr] ${text.trim()}`)
  })

  // Wait for worker to signal readiness
  const ready = await waitForWorkerReady(workerProcess, readyTimeout, () => ({
    stdout,
    stderr,
  }))

  if (!ready) {
    workerProcess.kill("SIGTERM")
    throw new Error(
      `Worker failed to become ready within ${readyTimeout}ms.\n` +
      `stdout: ${stdout}\n` +
      `stderr: ${stderr}`
    )
  }

  // Return handle with cleanup method
  return {
    process: workerProcess,
    kill: async () => {
      return new Promise((resolve) => {
        // Remove stdout/stderr listeners to prevent "Cannot log after tests are done"
        workerProcess.stdout?.removeAllListeners("data")
        workerProcess.stderr?.removeAllListeners("data")

        if (workerProcess.killed || workerProcess.exitCode !== null) {
          resolve()
          return
        }

        workerProcess.once("exit", () => {
          resolve()
        })

        // Send SIGTERM for graceful shutdown
        workerProcess.kill("SIGTERM")

        // Force kill after 10 seconds if still running
        setTimeout(() => {
          if (!workerProcess.killed && workerProcess.exitCode === null) {
            console.warn("[Worker] Force killing worker after timeout")
            workerProcess.kill("SIGKILL")
          }
        }, 10000)
      })
    },
  }
}

/**
 * Waits for the worker to output its "ready" message.
 * The worker logs "Worker is ready and listening for jobs" when ready.
 */
async function waitForWorkerReady(
  process: ChildProcess,
  timeoutMs: number,
  getOutput: () => { stdout: string; stderr: string }
): Promise<boolean> {
  return new Promise((resolve) => {
    const READY_MESSAGE = "Worker is ready"
    let resolved = false

    const checkReady = () => {
      const { stdout } = getOutput()
      if (stdout.includes(READY_MESSAGE)) {
        if (!resolved) {
          resolved = true
          resolve(true)
        }
      }
    }

    // Check periodically for the ready message
    const interval = setInterval(checkReady, 100)

    // Also check on each stdout chunk
    process.stdout?.on("data", checkReady)

    // Timeout
    const timeout = setTimeout(() => {
      clearInterval(interval)
      if (!resolved) {
        resolved = true
        resolve(false)
      }
    }, timeoutMs)

    // Handle early exit
    process.once("exit", (code) => {
      clearInterval(interval)
      clearTimeout(timeout)
      if (!resolved) {
        resolved = true
        console.error(`[Worker] Exited early with code ${code}`)
        resolve(false)
      }
    })
  })
}
