/**
 * @jest-environment node
 */
import { handlePullRequestClosedRemoveContainer } from "@/lib/webhook/github/handlers/pullRequest/closed.removeContainer.handler"
import type { PullRequestPayload } from "@/lib/webhook/github/types"
import { webhookFixtures } from "@/__tests__/fixtures/github/webhooks"

// Mock docker functions
jest.mock("@/lib/docker", () => ({
  listContainersByLabels: jest.fn(),
  stopAndRemoveContainer: jest.fn(),
}))

import {
  listContainersByLabels,
  stopAndRemoveContainer,
} from "@/lib/docker"

describe("handlePullRequestClosedRemoveContainer", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset console mocks
    jest.spyOn(console, "warn").mockImplementation()
    jest.spyOn(console, "log").mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("warns and returns early when repository name is missing", async () => {
    const payload = {
      ...webhookFixtures.pullRequest.closed.merged,
      repository: {
        ...webhookFixtures.pullRequest.closed.merged.repository,
        name: undefined as unknown as string,
      },
    } as PullRequestPayload

    await handlePullRequestClosedRemoveContainer({ payload })

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("Missing repo/owner/branch")
    )
    expect(listContainersByLabels).not.toHaveBeenCalled()
  })

  it("warns and returns early when owner login is missing", async () => {
    const payload = {
      ...webhookFixtures.pullRequest.closed.merged,
      repository: {
        ...webhookFixtures.pullRequest.closed.merged.repository,
        owner: {
          ...webhookFixtures.pullRequest.closed.merged.repository.owner,
          login: undefined as unknown as string,
        },
      },
    } as PullRequestPayload

    await handlePullRequestClosedRemoveContainer({ payload })

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("Missing repo/owner/branch")
    )
    expect(listContainersByLabels).not.toHaveBeenCalled()
  })

  it("warns and returns early when branch ref is missing", async () => {
    const payload = {
      ...webhookFixtures.pullRequest.closed.merged,
      pull_request: {
        ...webhookFixtures.pullRequest.closed.merged.pull_request,
        head: {
          ...webhookFixtures.pullRequest.closed.merged.pull_request.head,
          ref: undefined as unknown as string,
        },
      },
    } as PullRequestPayload

    await handlePullRequestClosedRemoveContainer({ payload })

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("Missing repo/owner/branch")
    )
    expect(listContainersByLabels).not.toHaveBeenCalled()
  })

  it("logs and returns early when no containers are found", async () => {
    const payload =
      webhookFixtures.pullRequest.closed.merged as PullRequestPayload
    jest.mocked(listContainersByLabels).mockResolvedValue([])

    await handlePullRequestClosedRemoveContainer({ payload })

    expect(listContainersByLabels).toHaveBeenCalledWith({
      preview: "true",
      owner: "test-owner",
      repo: "test-repo",
      branch: "feature/oauth",
    })
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("No matching containers found")
    )
    expect(stopAndRemoveContainer).not.toHaveBeenCalled()
  })

  it("successfully removes all containers when found", async () => {
    const payload =
      webhookFixtures.pullRequest.closed.merged as PullRequestPayload
    const containerNames = ["container-1", "container-2", "container-3"]

    jest.mocked(listContainersByLabels).mockResolvedValue(containerNames)
    jest.mocked(stopAndRemoveContainer).mockResolvedValue(undefined)

    await handlePullRequestClosedRemoveContainer({ payload })

    expect(listContainersByLabels).toHaveBeenCalledWith({
      preview: "true",
      owner: "test-owner",
      repo: "test-repo",
      branch: "feature/oauth",
    })
    expect(stopAndRemoveContainer).toHaveBeenCalledTimes(3)
    expect(stopAndRemoveContainer).toHaveBeenCalledWith("container-1")
    expect(stopAndRemoveContainer).toHaveBeenCalledWith("container-2")
    expect(stopAndRemoveContainer).toHaveBeenCalledWith("container-3")
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("Cleaned up 3 container(s)")
    )
    expect(console.warn).not.toHaveBeenCalled()
  })

  it("deduplicates container names before removing", async () => {
    const payload =
      webhookFixtures.pullRequest.closed.merged as PullRequestPayload
    // Duplicates in the list
    const containerNames = ["container-1", "container-1", "container-2"]

    jest.mocked(listContainersByLabels).mockResolvedValue(containerNames)
    jest.mocked(stopAndRemoveContainer).mockResolvedValue(undefined)

    await handlePullRequestClosedRemoveContainer({ payload })

    // Should only be called twice due to deduplication
    expect(stopAndRemoveContainer).toHaveBeenCalledTimes(2)
    expect(stopAndRemoveContainer).toHaveBeenCalledWith("container-1")
    expect(stopAndRemoveContainer).toHaveBeenCalledWith("container-2")
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("Cleaned up 2 container(s)")
    )
  })

  it("handles partial failures when some containers fail to remove", async () => {
    const payload =
      webhookFixtures.pullRequest.closed.merged as PullRequestPayload
    const containerNames = ["container-1", "container-2", "container-3"]

    jest.mocked(listContainersByLabels).mockResolvedValue(containerNames)
    jest
      .mocked(stopAndRemoveContainer)
      .mockResolvedValueOnce(undefined) // container-1 succeeds
      .mockRejectedValueOnce(new Error("Failed to remove")) // container-2 fails
      .mockResolvedValueOnce(undefined) // container-3 succeeds

    await handlePullRequestClosedRemoveContainer({ payload })

    expect(stopAndRemoveContainer).toHaveBeenCalledTimes(3)
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("1 container cleanup(s) failed")
    )
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("Cleaned up 2 container(s)")
    )
  })

  it("handles all containers failing to remove", async () => {
    const payload =
      webhookFixtures.pullRequest.closed.merged as PullRequestPayload
    const containerNames = ["container-1", "container-2"]

    jest.mocked(listContainersByLabels).mockResolvedValue(containerNames)
    jest
      .mocked(stopAndRemoveContainer)
      .mockRejectedValue(new Error("Failed to remove"))

    await handlePullRequestClosedRemoveContainer({ payload })

    expect(stopAndRemoveContainer).toHaveBeenCalledTimes(2)
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("2 container cleanup(s) failed")
    )
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("Cleaned up 0 container(s)")
    )
  })
})
