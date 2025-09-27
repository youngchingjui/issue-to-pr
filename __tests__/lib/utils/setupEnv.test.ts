jest.mock("node:child_process", () => {
  return {
    exec: jest.fn(),
  }
})

import { exec as execCallback } from "node:child_process"

import { setupEnv } from "@/lib/utils/cli"

// Cast for convenience – the mock is created above via jest.mock
const execMock = execCallback as unknown as jest.MockedFunction<
  typeof execCallback
>

describe("setupEnv utility", () => {
  const baseDir = process.cwd()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns confirmation when 'pnpm i' succeeds", async () => {
    // Arrange mocked successful exec
    execMock.mockImplementation(
      (
        cmd: string,
        options: unknown,
        callback: (error: Error | null, stdout: string, stderr: string) => void
      ) => {
        // Support optional options argument
        if (typeof options === "function") {
          callback = options
        }
        callback(null, "installation complete", "")
        // Return dummy ChildProcess object
        return {}
      }
    )

    const result = await setupEnv(baseDir, "pnpm i")

    expect(execMock).toHaveBeenCalledWith(
      "pnpm i",
      expect.objectContaining({ cwd: baseDir }),
      expect.any(Function)
    )
    expect(result).toContain("$ pnpm i")
    expect(result.length).toBeGreaterThan(0)
  })

  it("throws a helpful error when the command fails", async () => {
    // Arrange mocked failing exec
    execMock.mockImplementation(
      (
        cmd: string,
        options: unknown,
        callback: (error: Error | null, stdout: string, stderr: string) => void
      ) => {
        if (typeof options === "function") {
          callback = options
        }
        const error = new Error("mock failure")
        error.stdout = "some stdout"
        error.stderr = "some stderr"
        callback(error, "some stdout", "some stderr")
        return {}
      }
    )

    await expect(setupEnv(baseDir, "pnpm i")).rejects.toThrow(
      /Setup command failed/
    )
    expect(execMock).toHaveBeenCalled()
  })
})
