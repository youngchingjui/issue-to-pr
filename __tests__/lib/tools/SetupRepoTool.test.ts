import { z } from "zod"

import { createSetupRepoTool } from "@/lib/tools/SetupRepoTool"

afterEach(() => {
  jest.resetAllMocks()
})

jest.mock("child_process", () => ({
  exec: jest.fn(),
}))

import { exec } from "child_process"

const execMock = exec as unknown as jest.MockedFunction<
  (
    command: string,
    options: unknown,
    callback: (
      error: unknown,
      result?: { stdout?: string; stderr?: string }
    ) => void
  ) => void
>

describe("SetupRepoTool", () => {
  const baseDir = process.cwd()
  const tool = createSetupRepoTool(baseDir)

  describe("parameter schema validation", () => {
    const setupRepoParameters = z.object({
      cliCommand: z.string(),
    })

    it("accepts string cliCommand", () => {
      expect(() =>
        setupRepoParameters.parse({ cliCommand: "npm install" })
      ).not.toThrow()
    })

    it("rejects missing cliCommand", () => {
      expect(() => setupRepoParameters.parse({})).toThrow()
    })
  })

  describe("handler behavior", () => {
    it("returns error for multi-line commands", async () => {
      const result = await tool.handler({
        cliCommand: "npm install &&\necho done",
      })
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toMatch(/multi-line/i)
    })

    it("returns success for valid command", async () => {
      execMock.mockImplementation(
        (
          _cmd: string,
          _opts: unknown,
          cb: (err: null, res: { stdout: string; stderr: string }) => void
        ) => {
          cb(null, { stdout: "Setup complete", stderr: "" })
        }
      )

      const result = await tool.handler({ cliCommand: "npm install" })
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe("Setup complete")
      expect(result.stderr).toBe("")
    })

    it("captures error details when exec rejects", async () => {
      execMock.mockImplementation(
        (
          _cmd: string,
          _opts: unknown,
          cb: (
            err: (Error & { stderr?: string; code?: number }) | null,
            res?: { stdout?: string; stderr?: string }
          ) => void
        ) => {
          const error = new Error("Setup failed") as Error & {
            stderr?: string
            code?: number
          }
          error.stderr = "Install error details"
          error.code = 2
          cb(error)
        }
      )

      const result = await tool.handler({ cliCommand: "npm install" })
      expect(result.exitCode).toBe(2)
      expect(result.stderr).toContain("Install error details")
    })
  })
})
