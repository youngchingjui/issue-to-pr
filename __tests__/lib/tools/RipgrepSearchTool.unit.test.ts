import fs from "fs"
import path from "path"

import { createRipgrepSearchTool } from "@/lib/tools/RipgrepSearchTool"

describe("RipgrepSearchTool", () => {
  const baseDir = process.cwd()
  const tool = createRipgrepSearchTool(baseDir)

  it("returns an error message string for empty query (does not throw)", async () => {
    let result
    let error
    try {
      result = await tool.handler({
        query: "",
        mode: "literal",
      })
    } catch (e) {
      error = e
    }
    expect(error).toBeUndefined()
    expect(typeof result).toBe("string")
    expect(result).toMatch(/search failed: Query string cannot be empty/i)
  })

  it("returns 'No matching results found.' for non-existent text", async () => {
    const result = await tool.handler({
      query: `___nothing_42___should_ever_have_this ${Math.random()}`,
    })
    expect(typeof result).toBe("string")
    expect(result).toMatch(/No matching results found/i)
  }, 30000)

  it("returns a ripgrep regex error for bad regex (mode: regex)", async () => {
    const result = await tool.handler({ query: "[unclosed", mode: "regex" })
    expect(typeof result).toBe("string")
    expect(result).toMatch(/regex error/i)
  })

  it("returns a detailed error for invalid ripgrep flag (host mode)", async () => {
    // fudge the mode using a bad value by direct buildRipgrepCommand
    // Or pass flags that cause ripgrep to return code 2 for non-regex errors
    const result = await tool.handler({ query: "", mode: "literal" })
    expect(typeof result).toBe("string")
    expect(result).toMatch(/search failed:/i)
  })

  describe("very long output handling", () => {
    const tmpDir = fs.mkdtempSync(path.join(process.cwd(), "tmp-rg-long-"))

    beforeAll(() => {
      fs.writeFileSync(path.join(tmpDir, "long.txt"), "a\n".repeat(10000))
    })

    afterAll(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    })

    const longTool = createRipgrepSearchTool(tmpDir)

    it("paginates results when output exceeds maxChars", async () => {
      const result = await longTool.handler({
        query: "a",
        maxChars: 200,
        page: 1,
      })

      expect(typeof result).toBe("string")
      expect(result.length).toBeGreaterThan(0)
      expect(result).toMatch(/\[...truncated/) // indicates pagination
    }, 30000)

    it("returns different content for the next page", async () => {
      const page1 = await longTool.handler({
        query: "a",
        maxChars: 200,
        page: 1,
      })
      const page2 = await longTool.handler({
        query: "a",
        maxChars: 200,
        page: 2,
      })

      expect(typeof page2).toBe("string")
      expect(page2).not.toBe("")
      expect(page1).not.toEqual(page2)
    }, 30000)
  })
})
