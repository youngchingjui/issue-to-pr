import { createTsCheckTool } from "@/lib/tools/TsCheckTool";

describe("TsCheckTool", () => {
  const tool = createTsCheckTool();

  it("schema should accept empty params", () => {
    expect(() => tool.schema.parse({})).not.toThrow();
  });

  it("should return type error output or ok result", async () => {
    const result = await tool.handler({});
    // Output varies based on project health; Must always include ok & output fields
    expect(result).toHaveProperty("ok");
    expect(result).toHaveProperty("output");
    expect(typeof result.output).toBe("string");
    // ok can be true or false depending on the codebase
  });

  it("should provide an error if tsc is missing (simulate)", async () => {
    // Monkeypatch execPromise to simulate missing tsc
    jest.resetModules();
    jest.mock("child_process", () => ({
      exec: (_cmd: string, cb: any) => {
        const error = new Error("command not found: tsc");
        (error as any).code = "ENOENT";
        cb(error, null, "");
      },
    }));
    const { createTsCheckTool: freshCreateTsCheckTool } = require("@/lib/tools/TsCheckTool");
    const freshTool = freshCreateTsCheckTool();
    const result = await freshTool.handler({});
    expect(result.ok).toBe(false);
    expect(result.output).toMatch(/not installed|not found|ENOENT/i);
  });
});
