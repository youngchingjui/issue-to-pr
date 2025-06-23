import { z } from "zod"

import { createFileCheckTool } from "@/lib/tools/FileCheckTool"

// Utility to reset mocks between tests
afterEach(() => {
  jest.resetAllMocks()
})

// Dynamically mock child_process.exec BEFORE importing it for type safety
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

describe("FileCheckTool", () => {
  const baseDir = process.cwd()

  describe("parameter schema validation", () => {
    const fileCheckParameters = z.object({
      cliCommand: z.string(),
    })

    it("accepts string cliCommand", () => {
      expect(() =>
        fileCheckParameters.parse({ cliCommand: "eslint ." })
      ).not.toThrow()
    })

    it("rejects missing cliCommand", () => {
      expect(() => fileCheckParameters.parse({})).toThrow()
    })
  })

  describe("tool creation pattern", () => {
    it("creates a tool with the correct structure", () => {
      const tool = createFileCheckTool(baseDir)

      expect(tool.type).toBe("function")
      expect(tool.function.name).toBe("file_check")
      expect(tool.function.description).toContain("READ-ONLY code-quality")
      expect(typeof tool.schema).toBe("object")
      expect(typeof tool.handler).toBe("function")
    })
  })

  describe("handler behavior", () => {
    const tool = createFileCheckTool(baseDir)

    it("returns error for disallowed commands", async () => {
      const result = await tool.handler({ cliCommand: "rm -rf /" })

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toMatch(/Command not allowed/i)
    })

    it("returns success for allowed command when exec resolves", async () => {
      execMock.mockImplementation(
        (
          _cmd: string,
          _opts: unknown,
          cb: (err: null, res: { stdout: string; stderr: string }) => void
        ) => {
          cb(null, { stdout: "All good", stderr: "" })
        }
      )

      const result = await tool.handler({ cliCommand: "eslint --version" })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe("All good")
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
          const error = new Error("Lint error") as Error & {
            stderr?: string
            code?: number
          }
          error.stderr = "Lint error details"
          error.code = 2
          cb(error)
        }
      )

      const result = await tool.handler({ cliCommand: "eslint src/index.ts" })

      expect(result.exitCode).toBe(2)
      expect(result.stderr).toContain("Lint error details")
    })
  })
})
