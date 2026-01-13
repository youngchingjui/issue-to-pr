/**
 * @jest-environment node
 */
import { revalidateUserInstallationReposCache } from "@/lib/webhook/github/handlers/installation/revalidateRepositoriesCache.handler"

// Mock Next.js cache revalidation
jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
}))

import { revalidateTag } from "next/cache"

describe("revalidateUserInstallationReposCache", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("calls revalidateTag with 'user-installations' tag", async () => {
    await revalidateUserInstallationReposCache({
      installationId: "12345678",
    })

    expect(revalidateTag).toHaveBeenCalledTimes(1)
    expect(revalidateTag).toHaveBeenCalledWith("user-installations")
  })

  it("revalidates cache regardless of installation ID value", async () => {
    await revalidateUserInstallationReposCache({
      installationId: "99999999",
    })

    expect(revalidateTag).toHaveBeenCalledTimes(1)
    expect(revalidateTag).toHaveBeenCalledWith("user-installations")
  })

  it("does not throw when revalidateTag succeeds", async () => {
    jest.mocked(revalidateTag).mockReturnValue()

    await expect(
      revalidateUserInstallationReposCache({
        installationId: "12345678",
      })
    ).resolves.not.toThrow()
  })

  it("propagates error when revalidateTag throws", async () => {
    const mockError = new Error("Cache revalidation failed")
    jest.mocked(revalidateTag).mockImplementation(() => {
      throw mockError
    })

    await expect(
      revalidateUserInstallationReposCache({
        installationId: "12345678",
      })
    ).rejects.toThrow("Cache revalidation failed")
  })
})
