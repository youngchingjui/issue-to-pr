import { createRipgrepSearchTool } from "@/lib/tools/RipgrepSearchTool"
import fs from "fs"
import path from "path"

describe("RipgrepSearchTool", () => {
  const baseDir = process.cwd()
  const testFile = path.join(baseDir, "__tests__", "lib", "tools", "dummy_ripgrep.txt")
  const fileContent = `function foo() {\n  // single line\n}\n\nfunction bar() {\n  const a = 2\n  if (a > 1) {\n    console.log('multiline');\n  }\n}`

  beforeAll(() => {
    fs.writeFileSync(testFile, fileContent)
  })

  afterAll(() => {
    fs.unlinkSync(testFile)
  })

  it("finds a single line literal", async () => {
    const tool = createRipgrepSearchTool(baseDir)
    const result = await tool.handler({ query: "single line", mode: "literal" })
    expect(typeof result).toBe("string")
    expect(result).toContain("single line")
  })

  it("does not throw on missing result (code 1)", async () => {
    const tool = createRipgrepSearchTool(baseDir)
    const result = await tool.handler({ query: "notfound123456", mode: "literal" })
    expect(result).toMatch(/No matching results found\./)
  })

  it("returns structured error and suggestion when given an invalid literal containing newline", async () => {
    const tool = createRipgrepSearchTool(baseDir)
    // Typical error: "the literal \"\n\" is not allowed in a regex"
    const result = await tool.handler({ query: "foo() {\n  //", mode: "literal" })
    expect(result).toMatch(/Ripgrep search failed:/)
    expect(result).toMatch(/Suggestion: Set the \"multiline\" parameter to true/)
  })

  it("can search for multiline via multiline param", async () => {
    const tool = createRipgrepSearchTool(baseDir)
    const result = await tool.handler({ query: "foo() {\n  //", mode: "literal", multiline: true })
    expect(result).toContain("single line") // the line is included in context
  })

  it("returns helpfully for an invalid regex in regex mode", async () => {
    const tool = createRipgrepSearchTool(baseDir)
    const result = await tool.handler({ query: "*----invalid----*", mode: "regex" })
    expect(result).toMatch(/Ripgrep search failed:/)
  })
})
