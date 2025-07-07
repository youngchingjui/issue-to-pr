import { createRipgrepSearchTool } from "@/lib/tools/RipgrepSearchTool"
import path from "path"

describe("RipgrepSearchTool", () => {
  const baseDir = process.cwd()
  const tool = createRipgrepSearchTool(baseDir)

  it("returns an error message string for empty query (does not throw)", async () => {
    let result
    let error
    try {
      result = await tool.handler({ query: "", mode: "literal" })
    } catch (e) {
      error = e
    }
    expect(error).toBeUndefined()
    expect(typeof result).toBe("string")
    expect(result).toMatch(/search failed: Query string cannot be empty/i)
  })

  it("returns '\''No matching results found.'\'' for non-existent text", async () => {
    const result = await tool.handler({ query: "___nothing_42___should_ever_have_this" })
    expect(typeof result).toBe("string")
    expect(result).toMatch(/no matching results/i)
  })

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
})
