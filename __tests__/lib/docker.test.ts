/**
 * @jest-environment node
 */

import { execInContainerWithDockerode } from "shared/lib/docker"

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
    mockContainer.inspect = jest.fn().mockRejectedValue(new Error("Container not found"))

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