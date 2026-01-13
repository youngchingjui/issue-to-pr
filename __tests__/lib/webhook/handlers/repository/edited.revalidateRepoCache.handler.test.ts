/**
 * @jest-environment node
 */
import { handleRepositoryEditedRevalidate } from "@/lib/webhook/github/handlers/repository/edited.revalidateRepoCache.handler"
import type { RepositoryPayload } from "@/lib/webhook/github/types"
import { webhookFixtures } from "@/__tests__/fixtures/github/webhooks"

// Mock Next.js cache revalidation
jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
}))

import { revalidateTag } from "next/cache"

describe("handleRepositoryEditedRevalidate", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("calls revalidateTag with repository full_name", async () => {
    const payload = webhookFixtures.repository.edited as RepositoryPayload

    await handleRepositoryEditedRevalidate({ payload })

    expect(revalidateTag).toHaveBeenCalledTimes(1)
    expect(revalidateTag).toHaveBeenCalledWith("test-owner/test-repo")
  })

  it("revalidates cache with correct repository full_name for different repos", async () => {
    const payload = {
      ...webhookFixtures.repository.edited,
      repository: {
        ...webhookFixtures.repository.edited.repository,
        full_name: "different-owner/different-repo",
      },
    } as RepositoryPayload

    await handleRepositoryEditedRevalidate({ payload })

    expect(revalidateTag).toHaveBeenCalledTimes(1)
    expect(revalidateTag).toHaveBeenCalledWith("different-owner/different-repo")
  })

  it("does not throw when revalidateTag succeeds", async () => {
    const payload = webhookFixtures.repository.edited as RepositoryPayload
    jest.mocked(revalidateTag).mockReturnValue()

    await expect(
      handleRepositoryEditedRevalidate({ payload })
    ).resolves.not.toThrow()
  })

  it("propagates error when revalidateTag throws", async () => {
    const payload = webhookFixtures.repository.edited as RepositoryPayload
    const mockError = new Error("Cache revalidation failed")
    jest.mocked(revalidateTag).mockImplementation(() => {
      throw mockError
    })

    await expect(
      handleRepositoryEditedRevalidate({ payload })
    ).rejects.toThrow("Cache revalidation failed")
  })

  it("handles repository names with special characters", async () => {
    const payload = {
      ...webhookFixtures.repository.edited,
      repository: {
        ...webhookFixtures.repository.edited.repository,
        full_name: "org-name/repo.with-special_chars",
      },
    } as RepositoryPayload

    // Ensure mock is reset from previous test
    jest.mocked(revalidateTag).mockReturnValue()

    await handleRepositoryEditedRevalidate({ payload })

    expect(revalidateTag).toHaveBeenCalledWith("org-name/repo.with-special_chars")
  })
})
