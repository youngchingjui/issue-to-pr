import { runLint, LintResult } from "../../../lib/utils/lint";
import { execSync } from "child_process";

jest.mock("child_process");

describe("runLint", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("returns OK and output on successful lint", () => {
    (execSync as jest.Mock).mockReturnValue("Lint passed!");
    const result = runLint();
    expect(result).toEqual({ status: "OK", output: "Lint passed!" });
  });

  it("returns ERROR and error message on failed lint", () => {
    (execSync as jest.Mock).mockImplementation(() => {
      const err: any = new Error("Lint failed");
      err.stdout = "Partial output";
      err.stderr = "Missing semicolon";
      throw err;
    });
    const result = runLint();
    expect(result.status).toBe("ERROR");
    expect(result.output).toEqual("Partial output");
    expect(result.error).toEqual("Missing semicolon");
  });

  it("handles missing stderr and stdout", () => {
    (execSync as jest.Mock).mockImplementation(() => {
      const err: any = new Error("Process failed unexpectedly");
      throw err;
    });
    const result = runLint();
    expect(result.status).toBe("ERROR");
    expect(result.output).toBe("");
    expect(result.error).toContain("Process failed unexpectedly");
  });
});
