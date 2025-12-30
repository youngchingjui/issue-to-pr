/**
 * @jest-environment node
 */

import { execInContainerWithDockerode } from "@/shared/lib/docker"

// Mock dockerode completely
const mockExec = jest.fn().mockResolvedValue({
  start: jest.fn().mockResolvedValue({
    on: jest.fn((event, callback) => {
      if (event === "end") {
        setImmediate(callback)
      }
    }),
  }),
  inspect: jest.fn().mockResolvedValue({
    ExitCode: 0,
  }),
})

const mockDemuxStream = jest.fn((stream, stdout, stderr) => {
  // Simulate some output
  stdout.write("test output")
  stderr.write("")
})

const mockContainer = {
  inspect: jest.fn().mockResolvedValue({
    State: { Running: true },
  }),
  exec: mockExec,
  modem: {
    demuxStream: mockDemuxStream,
  },
}

jest.mock("dockerode", () => {
  return jest.fn().mockImplementation(() => ({
    getContainer: jest.fn().mockReturnValue(mockContainer),
  }))
})

describe("execInContainerWithDockerode", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("accepts string command and uses shell", async () => {
    const result = await execInContainerWithDockerode({
      name: "test-container",
      command: "echo hello",
    })

    expect(mockContainer.exec).toHaveBeenCalledWith(
      expect.objectContaining({
        Cmd: ["sh", "-c", "echo hello"],
      })
    )
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toBe("test output")
  })

  it("accepts string array command and avoids shell", async () => {
    const result = await execInContainerWithDockerode({
      name: "test-container",
      command: ["git", "status", "--porcelain"],
    })

    expect(mockContainer.exec).toHaveBeenCalledWith(
      expect.objectContaining({
        Cmd: ["git", "status", "--porcelain"],
      })
    )
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toBe("test output")
  })

  it("handles container not found error", async () => {
    // Temporarily override the mock for this test
    const originalInspect = mockContainer.inspect
    mockContainer.inspect = jest
      .fn()
      .mockRejectedValue(new Error("Container not found"))

    const result = await execInContainerWithDockerode({
      name: "nonexistent-container",
      command: "echo test",
    })

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain("Container not found or not running")

    // Restore the original mock
    mockContainer.inspect = originalInspect
  })

  it("handles empty container name", async () => {
    const result = await execInContainerWithDockerode({
      name: "",
      command: "echo test",
    })

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain("Container name must not be empty")
  })
})

describe("startContainer", () => {
  test.todo(
    "starts a detached container with correct image/name/user/workdir/env/labels/network"
  )
  test.todo(
    "defaults workdir to first mount containerPath when workdir is not provided"
  )
  test.todo(
    "passes bind mounts as HostConfig.Binds and supports readOnly mounts (:ro)"
  )
  test.todo("filters empty network aliases")
  test.todo("returns the created container id")
})

describe("stopAndRemoveContainer", () => {
  test.todo("stops container if it is running, then removes it with force=true")
  test.todo("does not attempt stop when inspect reports not running")
  test.todo("swallows errors and logs warnings when inspect/stop/remove fails")
})

describe("isContainerRunning", () => {
  test.todo("returns true when `docker inspect` reports State.Running=true")
  test.todo(
    "returns false when docker inspect throws (container not found / docker not running)"
  )
})

describe("listRunningContainers", () => {
  test.todo(
    "parses `docker ps --format` JSON lines into RunningContainer objects"
  )
  test.todo("returns [] on command failure")
})

describe("listContainersByLabels", () => {
  test.todo(
    "builds dockerode label filters and returns unique container names without leading slashes"
  )
  test.todo("filters out empty label values")
  test.todo("returns [] on dockerode failure")
})

describe("writeFileInContainer", () => {
  test.todo(
    "rejects invalid inputs via zod schema with exitCode=1 and helpful stderr"
  )
  test.todo(
    "writes file via heredoc to `${workdir}/${relPath}` and returns success message in stdout"
  )
  test.todo("creates parent directories when makeDirs=true")
  test.todo("uses execInContainerWithDockerode with cwd=workdir")
})

describe("getContainerStatus", () => {
  test.todo('returns docker inspect State.Status (e.g. "running")')
  test.todo('returns "not_found" when container cannot be inspected')
})

describe("getContainerGitInfo", () => {
  test.todo(
    'returns branch from `git rev-parse --abbrev-ref HEAD` and falls back to "unknown"'
  )
  test.todo("returns `git status --porcelain` output")
  test.todo(
    "returns `git diff --stat origin/main` output (fetches origin main first)"
  )
  test.todo("returns `git diff origin/main` output and truncates to diffLimit")
})
