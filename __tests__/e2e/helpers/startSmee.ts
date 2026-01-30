/**
 * Helper to start smee-client for forwarding GitHub webhooks to localhost.
 *
 * smee.io is a webhook proxy service that allows receiving GitHub webhooks locally.
 * This is useful for E2E tests that need to test the real webhook flow.
 */

import { type ChildProcess, spawn } from "child_process"

export interface SmeeClientHandle {
  /** The smee.io channel URL */
  url: string
  /** The local target URL receiving webhooks */
  targetUrl: string
  /** Kill the smee client process */
  kill: () => Promise<void>
  /** Get combined stdout/stderr output */
  getOutput: () => string
}

export interface StartSmeeOptions {
  /** The smee.io channel URL (e.g., https://smee.io/abc123) */
  smeeUrl: string
  /** Local path to forward webhooks to (default: /api/webhook/github) */
  path?: string
  /** Local port to forward webhooks to (default: 3001) */
  port?: number
  /** Timeout in ms to wait for smee to be ready (default: 10000) */
  readyTimeout?: number
}

/**
 * Starts the smee client to forward webhooks from smee.io to localhost.
 *
 * @example
 * ```ts
 * const smee = await startSmee({
 *   smeeUrl: "https://smee.io/tcPOj0ej3H5MOjGD",
 *   port: 3001,
 * })
 *
 * // ... run tests that trigger GitHub webhooks ...
 *
 * await smee.kill()
 * ```
 */
export async function startSmee(options: StartSmeeOptions): Promise<SmeeClientHandle> {
  const {
    smeeUrl,
    path = "/api/webhook/github",
    port = 3001,
    readyTimeout = 10000,
  } = options

  const targetUrl = `http://localhost:${port}${path}`

  let output = ""
  let smeeProcess: ChildProcess | null = null

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      if (smeeProcess) {
        smeeProcess.kill()
      }
      reject(new Error(`Smee client did not start within ${readyTimeout}ms`))
    }, readyTimeout)

    // Start smee client using npx to ensure we use the installed version
    smeeProcess = spawn(
      "npx",
      ["smee-client", "-u", smeeUrl, "--path", path, "--port", port.toString()],
      {
        env: { ...process.env },
        stdio: ["ignore", "pipe", "pipe"],
      }
    )

    smeeProcess.stdout?.on("data", (data: Buffer) => {
      const text = data.toString()
      output += text
      console.log(`[Smee stdout] ${text.trim()}`)

      // smee-client outputs "Forwarding https://smee.io/xxx to http://localhost:xxx"
      // when it's ready
      if (text.includes("Forwarding")) {
        clearTimeout(timeoutId)
        resolve({
          url: smeeUrl,
          targetUrl,
          kill: async () => {
            if (smeeProcess) {
              smeeProcess.kill("SIGTERM")
              // Wait for process to exit
              await new Promise<void>((res) => {
                smeeProcess?.on("exit", () => res())
                // Fallback timeout
                setTimeout(res, 2000)
              })
            }
          },
          getOutput: () => output,
        })
      }
    })

    smeeProcess.stderr?.on("data", (data: Buffer) => {
      const text = data.toString()
      output += text
      console.error(`[Smee stderr] ${text.trim()}`)
    })

    smeeProcess.on("error", (err) => {
      clearTimeout(timeoutId)
      reject(new Error(`Failed to start smee client: ${err.message}`))
    })

    smeeProcess.on("exit", (code) => {
      if (code !== 0 && code !== null) {
        clearTimeout(timeoutId)
        reject(new Error(`Smee client exited with code ${code}`))
      }
    })
  })
}
