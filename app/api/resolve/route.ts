import { promises as fs } from "fs"
import { NextRequest, NextResponse } from "next/server"
import os from "os"
import path from "path"
import simpleGit from "simple-git"

import {
  checkIfGitExists,
  checkIfLocalBranchExists,
  checkoutBranch,
  cloneRepo,
  createBranch,
  getLocalFileContent,
} from "@/lib/git"
import { createPullRequest, getIssue } from "@/lib/github"
import { identifyRelevantFiles } from "@/lib/nodes"
import { createTempRepoDir } from "@/lib/tempRepos"
import { generateNewContent } from "@/lib/utils"

const FILE_TO_EDIT = "app/page.tsx"
const NEW_BRANCH_NAME = "playground-fix"

export async function POST(request: NextRequest) {
  let tempDir: string | null = null
  const repoName = process.env.GITHUB_REPO
  const repoOwner = process.env.GITHUB_OWNER
  const repoUrl = process.env.GITHUB_REPO_URL

  try {
    console.debug("[DEBUG] Starting POST request handler")
    const { issueNumber } = await request.json()

    if (typeof issueNumber !== "number") {
      console.debug("[DEBUG] Invalid issue number provided:", issueNumber)
      return NextResponse.json(
        { error: "Invalid issueNumber provided." },
        { status: 400 }
      )
    }

    // Get repo directory (if exists)
    const dirPath = path.join(os.tmpdir(), "git-repos", repoOwner, repoName)

    console.debug(`[DEBUG] Checking if directory exists: ${dirPath}`)
    // Check if directory exists
    if (
      await fs
        .access(dirPath)
        .then(() => true)
        .catch(() => false)
    ) {
      console.debug(`[DEBUG] Directory exists: ${dirPath}`)
      tempDir = dirPath
    } else {
      // Create a temporary directory
      console.debug(`[DEBUG] Creating temporary directory: ${dirPath}`)
      tempDir = await createTempRepoDir(repoName)
    }

    // Check if .git and codebase exist in tempDir
    // If not, clone the repo
    // If so, checkout the branch
    console.debug(`[DEBUG] Checking if .git and codebase exist in ${tempDir}`)
    const gitExists = await checkIfGitExists(tempDir)
    if (!gitExists) {
      // Clone the repo
      console.debug(`[DEBUG] Cloning repo: ${repoUrl}`)
      await cloneRepo(repoUrl, tempDir)
    }

    console.debug(`[DEBUG] Fetching issue #${issueNumber}`)
    const issue = await getIssue(repoName, issueNumber)

    // Create branch name from issue
    const branchName = `${issueNumber}-${issue.title
      .toLowerCase()
      .replace(/\s+/g, "-")}`
    console.debug(`[DEBUG] Generated branch name: ${branchName}`)

    console.debug("[DEBUG] Initializing git operations")
    const git = simpleGit(tempDir)

    // Check if branch name already exists
    // If not, create it
    // Then, checkout the branch
    try {
      console.debug(`[DEBUG] Checking out branch: ${NEW_BRANCH_NAME}`)

      const branchExists = await checkIfLocalBranchExists(
        NEW_BRANCH_NAME,
        tempDir
      )
      if (!branchExists) {
        await createBranch(NEW_BRANCH_NAME, tempDir)
      }
      await checkoutBranch(NEW_BRANCH_NAME, tempDir)
    } catch (error) {
      console.debug("[DEBUG] Error during branch checkout:", error)
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 400 }
      )
    }

    // TODO: Identify which file(s) to edit based on issue
    // Here, we use LLMs to identify
    const { files } = await identifyRelevantFiles(issue, tempDir)

    // Generate code based on issue
    console.debug(
      `[DEBUG] Attempting to get file content from ${files[0]} in ${tempDir}`
    )
    // TODO: Find fileContent type
    let fileContent
    try {
      fileContent = await getLocalFileContent(`${tempDir}/${files[0]}`)
    } catch (error) {
      console.debug("[DEBUG] Error fetching file content:", error)
      return NextResponse.json(
        { error: "Failed to fetch file content." },
        { status: 500 }
      )
    }

    // TODO: Dynamically generate instructions based on the issue
    console.debug("[DEBUG] Generating new code content based on issue")
    const instructions = `
    Please generate a new file called "${files[0]}" that will resolve this issue:
      Title: ${issue.title}
      Description: ${issue.body}
    `
    const { code } = await generateNewContent(
      fileContent.toString(),
      instructions
    )

    console.debug("[DEBUG] Writing new code to file")
    await fs.writeFile(`${tempDir}/${FILE_TO_EDIT}`, code)

    console.debug(`[DEBUG] Staging file: ${FILE_TO_EDIT}`)
    await git.add(`${tempDir}/${FILE_TO_EDIT}`)

    console.debug("[DEBUG] Committing changes")
    try {
      await git.commit(`fix: ${issue.number}: ${issue.title}`)
    } catch (error) {
      // TODO: handle errors if there are not differences or changes to commit
      console.error("[ERROR] Error committing code:", error)
      return NextResponse.json(
        { error: "Failed to commit changes." },
        { status: 500 }
      )
    }

    console.debug(`[DEBUG] Pushing to remote branch: ${NEW_BRANCH_NAME}`)
    try {
      await git.push("origin", NEW_BRANCH_NAME)
    } catch (error) {
      console.error("[ERROR] Error pushing commit:", error)
      return NextResponse.json(
        { error: "Failed to push commit." },
        { status: 500 }
      )
    }

    // Generate PR on latest HEAD of branch
    // TODO: Find type for pr
    console.debug("[DEBUG] Creating pull request")
    let pr
    try {
      pr = await createPullRequest(
        repoOwner,
        repoName,
        issueNumber,
        NEW_BRANCH_NAME
      )
    } catch (error) {
      // TODO: Handle error if pull request already exists
      console.debug("[DEBUG] Error creating pull request:", error)
      if (error.response.data.errors[0].message.includes("already exists")) {
        return NextResponse.json(
          {
            error: `Pull request already exists for issue. Please remove any existing pull requests from ${NEW_BRANCH_NAME} to continue.`,
          },
          { status: 400 }
        )
      }
      // TODO: Handle errors if PR creation fails because of API limits, such as rate limits, plan limits, etc.
      console.error("Error creating PR:", error)
    }

    console.debug("[DEBUG] Operation completed successfully")
    return NextResponse.json(
      { message: "Issue resolved successfully.", pr: pr },
      { status: 200 }
    )
  } catch (error) {
    console.error("[ERROR] Fatal error in POST handler:", error)
    return NextResponse.json(
      { error: "Failed to resolve issue." },
      { status: 500 }
    )
  }
}
