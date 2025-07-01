import { createSetupTool } from "@/lib/tools/SetupTool"
import * as fs from "fs"
import * as path from "path"

describe("SetupTool", () => {
  const baseDir = path.resolve(__dirname, "../../mocks")
  // For most tests, we'll create/removal files in a tmp folder, but
  // here, for determinism, we use the provided fixtures & mock fs

  beforeAll(() => {
    jest.spyOn(fs, "existsSync").mockImplementation(origExistsSync)
    jest.spyOn(fs, "readdirSync").mockImplementation(origReaddirSync)
    jest.spyOn(fs, "readFileSync").mockImplementation(origReadFileSync)
  })

  afterAll(() => {
    jest.restoreAllMocks()
  })

  const origExistsSync = fs.existsSync.bind(fs)
  const origReaddirSync = fs.readdirSync.bind(fs)
  const origReadFileSync = fs.readFileSync.bind(fs)

  it("detects pnpm, docker, script, migrations, manual env step", async () => {
    const tool = createSetupTool(process.cwd()) // Use actual project root
    const result = await tool.handler({})
    // Should see pnpm
    expect(result.steps.some(s => s.command === "pnpm install")).toBe(true)
    // Should see docker compose (from docker/docker-compose.yml)
    expect(result.steps.some(s =>
      s.command.includes("docker compose -f docker/docker-compose.yml")
    )).toBe(true)
    // Should see start-services.sh
    expect(result.steps.some(s =>
      s.command === "sh scripts/start-services.sh"
    )).toBe(true)
    // Should see migration .sh scripts
    expect(result.steps.some(s =>
      s.command === "sh scripts/migrations/backup-neo4j.sh"
    )).toBe(true)

    // Should extract manual step lines containing 'export', 'env', or 'set the'
    expect(result.manualSteps.some(
      l => l.toLowerCase().includes('export') || l.toLowerCase().includes('env')
    )).toBe(true)
  })

  it("warns for multiple managers", async () => {
    jest.spyOn(fs, "existsSync").mockImplementation((file) => {
      if ((file as string).endsWith("pnpm-lock.yaml") || (file as string).endsWith("yarn.lock")) return true;
      return origExistsSync(file)
    })
    const tool = createSetupTool(process.cwd())
    const result = await tool.handler({})
    expect(result.warnings && result.warnings.some(w => /more than one/i.test(w))).toBe(true)
  })

  it("works with only yarn or npm", async () => {
    jest.spyOn(fs, "existsSync").mockImplementation((file) => {
      if ((file as string).endsWith("yarn.lock")) return true;
      if ((file as string).endsWith("pnpm-lock.yaml") || (file as string).endsWith("package-lock.json")) return false;
      return origExistsSync(file)
    })
    const tool = createSetupTool(process.cwd())
    const result = await tool.handler({})
    expect(result.steps.some(s => s.command === "yarn install")).toBe(true)
    expect(result.steps.some(s => s.command === "npm install" || s.command === "pnpm install")).toBe(false)
  })

  it("collects migration scripts if present", async () => {
    jest.spyOn(fs, "existsSync").mockImplementation((file) => {
      if ((file as string).includes("scripts/migrations")) return true
      return origExistsSync(file)
    })
    jest.spyOn(fs, "readdirSync").mockImplementation((dir) => {
      if ((dir as string).endsWith("scripts/migrations")) return ["foo.sh", "bar.txt"]
      return origReaddirSync(dir)
    })
    const tool = createSetupTool(process.cwd())
    const result = await tool.handler({})
    expect(result.steps.some(s => s.command === "sh scripts/migrations/foo.sh")).toBe(true)
    expect(result.steps.some(s => s.command === "sh scripts/migrations/bar.txt")).toBe(false)
  })

  it("parses manual env/export lines from README and docs/setup/guides", async () => {
    jest.spyOn(fs, "existsSync").mockImplementation((file) => {
      if ((file as string).endsWith("README.md")) return true
      if ((file as string).endsWith("docs/setup/getting-started.md")) return true
      return origExistsSync(file)
    })
    jest.spyOn(fs, "readFileSync").mockImplementation((file, enc) => {
      if ((file as string).endsWith("README.md")) {
        return "export FOO=bar\nSet the X env variable\nenvVAR=value\nmanually start the server"
      }
      if ((file as string).endsWith("getting-started.md")) {
        return "export BAR=qux\n" +
        "manually migrate your DB\n"
      }
      return origReadFileSync(file, enc)
    })
    const tool = createSetupTool(process.cwd())
    const result = await tool.handler({})
    expect(
      result.manualSteps.filter(l => l.toLowerCase().includes("export") || l.toLowerCase().includes("env")).length
    ).toBeGreaterThan(1)
    expect(result.manualSteps.some(l => l.toLowerCase().includes("manually"))).toBe(true)
  })
})
