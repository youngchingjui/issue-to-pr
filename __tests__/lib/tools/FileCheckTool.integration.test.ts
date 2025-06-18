// Ensure we use the real child_process implementation (the unit test file mocks it)
jest.unmock("child_process")

import path from "path"

import { createFileCheckTool } from "@/lib/tools/FileCheckTool"

describe("FileCheckTool – integration (actual CLI)", () => {
  // Use the workspace root as the base dir so commands are executed relative to the project
  const baseDir = path.resolve(__dirname, "../../..")
  const tool = createFileCheckTool(baseDir)

  /**
   * Helper to normalise stderr/stdout for cross-platform assertions
   */
  function normalise(out: string) {
    return out.replace(/\r\n/g, "\n")
  }

  it("returns a non-zero exit code for a tsc command with an invalid flag", async () => {
    const result = await tool.handler({ cliCommand: "tsc --notARealFlag" })

    expect(result.exitCode).not.toBe(0)
    expect(normalise(result.stdout)).toMatch(/error/i)
  })

  it("successfully type-checks a valid TypeScript file", async () => {
    const mockGoodFile = path.join("__tests__", "mocks", "goodTsc.ts")
    const result = await tool.handler({
      cliCommand: `tsc --noEmit ${mockGoodFile}`,
    })

    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe("")
  }, 20000)
})
