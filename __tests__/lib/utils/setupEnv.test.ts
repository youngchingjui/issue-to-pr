jest.mock("node:child_process", () => {
  return {
    exec: jest.fn(),
  }
})

import type {
  ChildProcess,
  ExecException,
  ExecOptions,
} from "node:child_process"
import { exec as execCallback } from "node:child_process"

import { setupEnv } from "@/lib/utils/cli"

// Cast for convenience – the mock is created above via jest.mock
const execMock = execCallback as unknown as jest.MockedFunction<
  typeof execCallback
>

// Typed callback used by our mock
type ExecCallback = (
  error: ExecException | null,
  stdout: string,
  stderr: string
) => void

describe("setupEnv utility", () => {
  const baseDir = process.cwd()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns confirmation when 'pnpm i' succeeds", async () => {
    execMock.mockImplementation(
      (
        cmd: string,
        optionsOrCallback?: ExecOptions | ExecCallback | null,
        maybeCallback?: ExecCallback | null
      ): ChildProcess => {
        const callback: ExecCallback =
          typeof optionsOrCallback === "function"
            ? optionsOrCallback
            : (maybeCallback as ExecCallback)

        callback(null, "installation complete", "")

        // We don't care about the ChildProcess in this test; satisfy TS with a cast.
        return {} as ChildProcess
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
    execMock.mockImplementation(
      (
        cmd: string,
        optionsOrCallback?: ExecOptions | ExecCallback | null,
        maybeCallback?: ExecCallback | null
      ): ChildProcess => {
        const callback: ExecCallback =
          typeof optionsOrCallback === "function"
            ? optionsOrCallback
            : (maybeCallback as ExecCallback)

        const error: ExecException & {
          stdout: string
          stderr: string
        } = Object.assign(new Error("mock failure"), {
          stdout: "some stdout",
          stderr: "some stderr",
        })

        callback(error, "some stdout", "some stderr")
        return {} as ChildProcess
      }
    )

    await expect(setupEnv(baseDir, "pnpm i")).rejects.toThrow(
      /Setup command failed/
    )
    expect(execMock).toHaveBeenCalled()
  })
})
