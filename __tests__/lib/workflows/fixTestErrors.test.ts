import { fixTestErrors, FixTestErrorsParams } from "@/lib/workflows/fixTestErrors"

describe("fixTestErrors workflow", () => {
  const repoFullName = "octocat/hello-world"
  const pullNumber = 5
  const apiKey = "sk-mock"
  const jobId = "job-123"
  const mockBaseDir = "/tmp/repo"

  it("should run the workflow and return LLM suggestion (all mocks)", async () => {
    const runTestsFn = jest.fn().mockResolvedValue("Test failed: 1 failing\n    ● MyTest › should foo\n      expect(received).toBe(true)\n      Received: false")
    const llmAgent = jest.fn().mockResolvedValue("Change expected to true in MyTest.")
    const result = await fixTestErrors({
      repoFullName,
      pullNumber,
      apiKey,
      jobId,
      baseDir: mockBaseDir,
      runTestsFn,
      llmAgent,
    })
    expect(runTestsFn).toHaveBeenCalledWith({ baseDir: mockBaseDir })
    expect(llmAgent).toHaveBeenCalledWith({ testOutput: expect.stringContaining("Test failed"), apiKey })
    expect(result).toContain("Change expected to true")
  })

  it("should use default error message if llmAgent returns empty string", async () => {
    const runTestsFn = jest.fn().mockResolvedValue("Some test output")
    const llmAgent = jest.fn().mockResolvedValue("")
    const result = await fixTestErrors({
      repoFullName,
      pullNumber,
      apiKey,
      baseDir: mockBaseDir,
      runTestsFn,
      llmAgent,
    })
    expect(result).toEqual("")
  })

  it("should return test output on test failure", async () => {
    const runTestsFn = jest.fn().mockImplementation(() => { throw { stdout: "fail output", stderr: "my error", message: "fail msg" } })
    const llmAgent = jest.fn().mockResolvedValue("try xyz fix")
    const result = await fixTestErrors({
      repoFullName,
      pullNumber,
      apiKey,
      baseDir: mockBaseDir,
      runTestsFn,
      llmAgent,
    })
    expect(result).toContain("try xyz fix")
  })

  it("should call setupLocalRepository in default flow (integration stub)", async () => {
    // Stub setupLocalRepository and exec
    jest.resetModules()
    jest.doMock("@/lib/utils/utils-server", () => ({
      setupLocalRepository: jest.fn().mockResolvedValue("/tmp/testrepo")
    }))
    jest.doMock("child_process", () => ({
      exec: (_cmd: string, _opts: any, cb: Function) => cb(null, { stdout: "PASS all tests", stderr: "" })
    }))
    const module = await import("@/lib/workflows/fixTestErrors")
    const { fixTestErrors } = module
    const suggestion = await fixTestErrors({ repoFullName, pullNumber, apiKey })
    expect(suggestion).toContain("PASS all tests")
  })
})
