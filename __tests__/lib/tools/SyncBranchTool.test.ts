import * as gitModule from "@/lib/git"
import { createSyncBranchTool } from "@/lib/tools/SyncBranchTool"
import { RepoFullName } from "@/lib/types/github"

describe("SyncBranchTool", () => {
  const repoFullName = "octocat/Hello-World" as RepoFullName
  const baseDir = "/tmp/example-repo"
  const token = "test-oauth-token"
  const branch = "feature/foo"

  it("calls pushBranch with the correct token & repo", async () => {
    const pushSpy = jest
      .spyOn(gitModule, "pushBranch")
      .mockImplementation(async () => "push-success")

    const tool = createSyncBranchTool(repoFullName, baseDir, token)
    const params = { branch }
    const resStr = await tool.handler(params)
    expect(pushSpy).toHaveBeenCalledWith(branch, baseDir, token, repoFullName)
    expect(resStr).toMatch(/success/i)
  })

  it("errors if pushBranch throws", async () => {
    jest.spyOn(gitModule, "pushBranch").mockImplementation(async () => {
      throw new Error("remote rejected")
    })
    const tool = createSyncBranchTool(repoFullName, baseDir, token)
    const params = { branch }
    const resStr = await tool.handler(params)
    expect(resStr).toMatch(/failed to push/i)
    expect(resStr).toMatch(/remote rejected/i)
  })
})
