import { runTsCheck, PNPM_TSC_COMMAND } from "../../lib/cli"

describe("runTsCheck", () => {
  it("returns pass: true for a passing TypeScript codebase", async () => {
    // This assumes the codebase currently passes pnpm lint:tsc
    const result = await runTsCheck()
    expect(result).toHaveProperty("pass", true)
    expect(typeof result.output).toBe("string")
    expect(result.output.length).toBeGreaterThanOrEqual(0)
  })

  it("returns pass: false and an error for a failing ts check (simulated)", async () => {
    // Patch the command to something guaranteed to fail.
    const originalCmd = PNPM_TSC_COMMAND
    // Intentionally use an invalid command to force an error
    ;(global as any).PNPM_TSC_COMMAND = "pnpm notarealcommand"
    const result = await runTsCheck()
    expect(result).toMatchObject({ pass: false })
    expect(typeof result.error).toBe("string")
    // Reset the command
    ;(global as any).PNPM_TSC_COMMAND = originalCmd
  })

  it("returns pass: false if command is not found (simulate missing pnpm)", async () => {
    // Intentionally use an invalid executable
    const originalCmd = PNPM_TSC_COMMAND
    ;(global as any).PNPM_TSC_COMMAND = "notahhhhrealcmd1234 lint:tsc"
    const result = await runTsCheck()
    expect(result).toMatchObject({ pass: false })
    expect(result.error).toEqual(expect.stringContaining("notahhhhrealcmd1234"))
    ;(global as any).PNPM_TSC_COMMAND = originalCmd
  })
})
