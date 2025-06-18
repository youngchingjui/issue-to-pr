import fs from "fs"
import path from "path"

import { runTsCheck } from "@/lib/cli"

// Path to the mocked messages file
const messagesPath = path.join(__dirname, "../mocks/messages3.json")

// Read and parse messages
const messages = JSON.parse(fs.readFileSync(messagesPath, "utf-8")) as Array<{
  type: string
  toolName?: string
  args?: string
  id?: string
}>

describe("runTsCheck on write_file snippets", () => {
  // Use a temp directory inside the workspace root so that `tsc` can discover
  // the project's tsconfig.json via ancestor directory search.
  const tmpDir = fs.mkdtempSync(path.join(process.cwd(), "tmp-tscheck-msgs-"))

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  const writeFileCalls = messages.filter(
    (m) =>
      m.type === "toolCall" &&
      m.toolName === "write_file" &&
      typeof m.args === "string"
  )

  if (writeFileCalls.length === 0) {
    it("should find at least one write_file call in messages", () => {
      expect(writeFileCalls.length).toBeGreaterThan(0)
    })
    return
  }

  // IDs of messages whose generated TypeScript is *expected* to FAIL compilation.
  const knownFailingIds = new Set<string>([
    "7c0b7ec1-2741-49d5-b7c0-559b83bffca3",
    "279a5e42-aa97-46f2-a37e-777cd8cc6ffe",
    "19154468-834c-45ca-af3a-f7f32ed6fbca",
  ])

  writeFileCalls.forEach((call, index) => {
    const parsedArgs = JSON.parse(call.args as string) as {
      relativePath: string
      content: string
    }

    it(`write_file call #${index + 1} (id: ${call.id ?? "unknown"}) should ${
      knownFailingIds.has(call.id ?? "")
        ? "fail TypeScript compilation"
        : "produce TypeScript that compiles"
    }`, async () => {
      const ext = path.extname(parsedArgs.relativePath) || ".ts"
      const tmpFile = path.join(tmpDir, `snippet_${index}${ext}`)
      fs.writeFileSync(tmpFile, parsedArgs.content)

      const result = await runTsCheck(tmpFile)

      const shouldPass = !knownFailingIds.has(call.id ?? "")

      if (shouldPass) {
        if (!result.pass) {
          // Provide useful debugging information when the test fails unexpectedly
          console.error(
            `TypeScript check failed for snippet from message id ${call.id}`
          )
          if (result.output) console.error(result.output)
          console.error(result.error)
        }
        expect(result.pass).toBe(true)
      } else {
        if (result.pass) {
          console.error(
            `Expected TypeScript check to fail for message id ${call.id}, but it passed.`
          )
        }
        expect(result.pass).toBe(false)
      }
    })
  })
})
