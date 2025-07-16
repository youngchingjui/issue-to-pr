import fs from "fs"
import os from "os"
import path from "path"

import { createApplyPatchTool } from "@/lib/tools/ApplyPatchTool"

describe("ApplyPatchTool", () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "apply-patch-"))
    fs.writeFileSync(path.join(tmpDir, "sample.txt"), "one\ntwo\nthree")
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it("applies a simple patch correctly", async () => {
    const tool = createApplyPatchTool(tmpDir)
    const patch = ["one", "-two", "+TWO", "three"].join("\n")

    const result = await tool.handler({ filePath: "sample.txt", patch })

    expect(result.status).toBe("ok")
    const updated = fs.readFileSync(path.join(tmpDir, "sample.txt"), "utf-8")
    expect(updated).toBe("one\nTWO\nthree")
  })

  it("returns an error when the file does not exist", async () => {
    const tool = createApplyPatchTool(tmpDir)
    const patch = ["one", "-two", "+TWO", "three"].join("\n")

    const result = await tool.handler({ filePath: "missing.txt", patch })

    expect(result.status).toBe("error")
    expect(result.message).toMatch(/File not found/i)
  })

  it("returns an error for a malformed patch", async () => {
    const tool = createApplyPatchTool(tmpDir)
    const patch = ["unexpected", "-two", "+TWO", "three"].join("\n")

    const result = await tool.handler({ filePath: "sample.txt", patch })

    expect(result.status).toBe("error")
    expect(result.message).toMatch(/Could not find|Failed to apply patch/i)
  })
})
