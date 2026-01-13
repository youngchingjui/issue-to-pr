import { createGetFileContentTool } from "@/lib/tools/GetFileContent"

// Helper to get a guaranteed missing file name
function getMissingFileName() {
  return `___definitely_missing_file_${Date.now()}.txt`
}

describe("GetFileContent tool", () => {
  const baseDir = process.cwd()

  it("returns a string error message when file does not exist, and does not throw", async () => {
    const tool = createGetFileContentTool(baseDir)
    const fakePath = getMissingFileName()

    // Call tool handler directly
    let result: unknown
    let errorCaught: unknown
    try {
      result = await tool.handler({ relativePath: fakePath })
    } catch (err) {
      errorCaught = err
    }

    expect(errorCaught).toBeUndefined()
    expect(typeof result).toBe("string")
    expect(result).toMatch(/no such file|ENOENT|not found/i) // Node ENOENT msg
  })

  it("returns contents for a real file", async () => {
    const tool = createGetFileContentTool(baseDir)
    const existing = "README.md"
    const result = await tool.handler({ relativePath: existing })

    expect(typeof result).toBe("string")
    expect(result.length).toBeGreaterThan(1)
    // Should contain recognizable README text:
    expect(result).toMatch(/issue-to-pr|github|readme/i)
  })

  it("returns an error message when a directory is given", async () => {
    const tool = createGetFileContentTool(baseDir)
    const dirPath = "__tests__/lib/tools/"
    let result: unknown
    let errorCaught: unknown
    try {
      result = await tool.handler({ relativePath: dirPath })
    } catch (err) {
      errorCaught = err
    }

    expect(errorCaught).toBeUndefined()
    expect(typeof result).toBe("string")
    expect(result).toMatch(/directory/i)
  })
})
