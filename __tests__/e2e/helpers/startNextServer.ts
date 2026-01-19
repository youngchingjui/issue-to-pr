/**
 * Helper to spawn and manage the Next.js dev server for E2E tests.
 *
 * The server is spawned as a child process with E2E-specific environment variables,
 * including queue isolation via BULLMQ_QUEUE_NAME.
 */
import type { ChildProcess } from "child_process"
import { spawn } from "child_process"
import http from "http"

export interface NextServerHandle {
  process: ChildProcess
  url: string
  kill: () => Promise<void>
}

export interface StartNextServerOptions {
  /** Environment variables to pass to the server */
  env: Record<string, string>
  /** Path to the project root (defaults to process.cwd()) */
  projectRoot?: string
  /** Port to run the server on (default: 3001 to avoid conflict with dev server) */
  port?: number
  /** Timeout in ms to wait for server to be ready (default: 60000) */
  readyTimeout?: number
}

/**
 * Checks if a server is already running and responding on the given URL
 */
async function isServerRunning(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      // Any response means server is running
      resolve(res.statusCode !== undefined)
    })

    req.on("error", () => {
      resolve(false)
    })

    req.setTimeout(2000, () => {
      req.destroy()
      resolve(false)
    })
  })
}

/**
 * Spawns the Next.js dev server and waits for it to be ready.
 *
 * If a server is already running on the port, returns a handle that won't kill
 * the existing server on cleanup.
 *
 * @returns A handle to the server process with a kill() method for cleanup
 */
export async function startNextServer(
  options: StartNextServerOptions
): Promise<NextServerHandle> {
  const {
    env,
    projectRoot = process.cwd(),
    port = 3001,
    readyTimeout = 60000,
  } = options

  const url = `http://localhost:${port}`

  // Check if server is already running
  const alreadyRunning = await isServerRunning(url)
  if (alreadyRunning) {
    console.log(`[Next.js] Server already running at ${url}`)
    return {
      process: null as unknown as ChildProcess, // No process to manage
      url,
      kill: async () => {
        // Don't kill existing server
        console.log("[Next.js] Not killing pre-existing server")
      },
    }
  }

  // Merge environment: inherit from current process but override with test-specific vars
  const serverEnv = {
    ...process.env,
    ...env,
    PORT: String(port),
    // Force color output in case the test runner strips it
    FORCE_COLOR: "1",
  }

  // Spawn the Next.js dev server
  const serverProcess = spawn("pnpm", ["next", "dev", "-p", String(port)], {
    cwd: projectRoot,
    env: serverEnv,
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
  })

  // Collect output for debugging
  let stdout = ""
  let stderr = ""

  serverProcess.stdout?.on("data", (data: Buffer) => {
    const text = data.toString()
    stdout += text
    // Log server output prefixed for clarity
    console.log(`[Next.js stdout] ${text.trim()}`)
  })

  serverProcess.stderr?.on("data", (data: Buffer) => {
    const text = data.toString()
    stderr += text
    console.error(`[Next.js stderr] ${text.trim()}`)
  })

  // Wait for server to be ready by polling the URL
  const ready = await waitForServerReady(url, readyTimeout, serverProcess)

  if (!ready) {
    serverProcess.kill("SIGTERM")
    throw new Error(
      `Next.js server failed to become ready within ${readyTimeout}ms.\n` +
      `stdout: ${stdout}\n` +
      `stderr: ${stderr}`
    )
  }

  console.log(`[Next.js] Server ready at ${url}`)

  // Return handle with cleanup method
  return {
    process: serverProcess,
    url,
    kill: async () => {
      return new Promise((resolve) => {
        // Remove stdout/stderr listeners to prevent "Cannot log after tests are done"
        serverProcess.stdout?.removeAllListeners("data")
        serverProcess.stderr?.removeAllListeners("data")

        if (serverProcess.killed || serverProcess.exitCode !== null) {
          resolve()
          return
        }

        serverProcess.once("exit", () => {
          resolve()
        })

        // Send SIGTERM for graceful shutdown
        serverProcess.kill("SIGTERM")

        // Force kill after 10 seconds if still running
        setTimeout(() => {
          if (!serverProcess.killed && serverProcess.exitCode === null) {
            console.warn("[Next.js] Force killing server after timeout")
            serverProcess.kill("SIGKILL")
          }
        }, 10000)
      })
    },
  }
}

/**
 * Polls the server URL until it responds or timeout is reached.
 */
async function waitForServerReady(
  url: string,
  timeoutMs: number,
  process: ChildProcess
): Promise<boolean> {
  const start = Date.now()
  const pollInterval = 1000 // Check every second

  while (Date.now() - start < timeoutMs) {
    // Check if process has exited
    if (process.exitCode !== null) {
      console.error(`[Next.js] Server process exited with code ${process.exitCode}`)
      return false
    }

    // Try to connect to the server
    const running = await isServerRunning(url)
    if (running) {
      return true
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, pollInterval))
  }

  return false
}
