import { zodFunction } from "openai/helpers/zod"
import path from "path"
import { z } from "zod"

import { getFileContent } from "@/lib/fs"
import { checkBranchExists, updateFileContent } from "@/lib/github/content"
import {
  createPullRequest,
  getPullRequestOnBranch,
} from "@/lib/github/pullRequests"
import { Tool } from "@/lib/types"

import { createBranch } from "../github/git"

// TODO: Automate this part
const REPO_NAME = "issue-to-pr"

const uploadAndPRParameters = z.object({
  files: z
    .array(z.string())
    .describe("The relative path of the files to upload"),
  commitMessage: z
    .string()
    .describe("The commit message to use for the pull request"),
  branch: z
    .string()
    .describe("The a new branch name to create the pull request on"),
  pullRequest: z.object({
    title: z.string().describe("The title of the pull request"),
    body: z.string().describe("The body of the pull request"),
  }),
})

class UploadAndPRTool implements Tool<typeof uploadAndPRParameters> {
  parameters = uploadAndPRParameters
  tool = zodFunction({
    name: "upload_and_create_PR",
    parameters: uploadAndPRParameters,
  })

  constructor(
    private baseDir: string,
    private repoName: string
  ) {}

  async handler(params: z.infer<typeof uploadAndPRParameters>) {
    const { files, commitMessage, branch, pullRequest } = params

    // By now, the updated code should be saved locally. We'll pull up those updated files
    // TODO: Add a check in case the files are not updated.
    // Get the latest contents for each file

    const fileContents: Map<string, string> = new Map()
    for (const file of files) {
      const contents = await getFileContent(path.join(this.baseDir, file))
      fileContents.set(file, contents)
    }

    // First, create branch if it doesn't exist
    const branchExists = await checkBranchExists(REPO_NAME, branch)
    if (!branchExists) {
      await createBranch(REPO_NAME, branch)
    }

    // Upload files to Github
    for (const file of files) {
      console.debug(`[DEBUG] Updating file on Github: ${file}`)
      await updateFileContent({
        repo: REPO_NAME,
        path: file,
        content: fileContents.get(file),
        commitMessage,
        branch,
      })
    }

    // Check if PR on branch exists before creating new one
    const existingPR = await getPullRequestOnBranch({ repo: REPO_NAME, branch })
    if (existingPR) {
      // There exists a PR already
      return new Error(
        `There already exists an PR on this branch: ${branch}. PR: ${existingPR}`
      )
    }

    // Generate PR on latest HEAD of branch
    console.debug("[DEBUG] Creating pull request")
    try {
      await createPullRequest({
        repo: REPO_NAME,
        branch,
        title: pullRequest.title,
        body: pullRequest.body,
      })
    } catch (error) {
      return new Error(error)
    }
  }
}

export default UploadAndPRTool
