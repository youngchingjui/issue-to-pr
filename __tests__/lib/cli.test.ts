import fs from "fs"
import os from "os"
import path from "path"

import { runTsCheck } from "@/lib/cli"

describe("runTsCheck", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tscheck-test-"))

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it("returns pass: true for a valid TypeScript file", async () => {
    const validFile = path.join(tmpDir, "valid.ts")
    fs.writeFileSync(validFile, "const a: number = 1;\n")

    const result = await runTsCheck(validFile)
    expect(result.pass).toBe(true)
    if (result.pass) {
      expect(typeof result.output).toBe("string")
    }
  }, 20000)

  it("returns pass: false for an invalid TypeScript file", async () => {
    const invalidFile = path.join(tmpDir, "invalid.ts")
    fs.writeFileSync(invalidFile, "const a: string = 1;\n")

    const result = await runTsCheck(invalidFile)
    expect(result.pass).toBe(false)
    expect("error" in result).toBe(true)
  }, 20000)
})
