import { promises as fs } from "fs"
import { NextRequest, NextResponse } from "next/server"
import simpleGit from "simple-git"

import { generateCodeEditPlan, generateNewContent } from "@/lib/agents"
import { getRepoDir } from "@/lib/fs"
import {
  checkIfGitExists,
  checkIfLocalBranchExists,
  checkoutBranch,
  cloneRepo,
  createBranch,
  getLocalFileContent,
} from "@/lib/git"
import { createPullRequest, getIssue } from "@/lib/github-old"
import { langfuse } from "@/lib/langfuse"
import { GitHubRepository } from "@/lib/types"

const NEW_BRANCH_NAME = "playground-fix"

type RequestBody = {
  issueNumber: number
  repo: GitHubRepository
}

export async function POST(request: NextRequest) {
  const { issueNumber, repo }: RequestBody = await request.json()
  const repoName = repo.name
  const repoOwner = repo.owner.login
  const repoUrl = repo.url
  const cloneUrl = repo.clone_url

  const trace = langfuse.trace({ name: "Generate code and create PR" })

  try {
    console.debug("[DEBUG] Starting POST request handler")

    if (typeof issueNumber !== "number") {
      console.debug("[DEBUG] Invalid issue number provided:", issueNumber)
      return NextResponse.json(
        { error: "Invalid issueNumber provided." },
        { status: 400 }
      )
    }

    // Get tempDir for repo
    const tempDir = await getRepoDir(repoOwner, repoName)

    // Check if .git and codebase exist in tempDir
    // If not, clone the repo
    // If so, checkout the branch
    console.debug(`[DEBUG] Checking if .git and codebase exist in ${tempDir}`)
    const gitExists = await checkIfGitExists(tempDir)
    if (!gitExists) {
      // Clone the repo
      console.debug(`[DEBUG] Cloning repo: ${repoUrl}`)
      await cloneRepo(cloneUrl, tempDir)
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

    // Generate code edit plan
    console.debug("[DEBUG] Generating code edit plan")
    const { edits } = await generateCodeEditPlan(issue, tempDir, trace)

    const filesContents: { [key: string]: string } = {}
    for (const edit of edits) {
      filesContents[edit.file] = await getLocalFileContent(
        `${tempDir}/${edit.file}`
      )
    }

    // TODO: Dynamically generate instructions based on the issue
    console.debug("[DEBUG] Generating new code based on edit plan")

    const promises = edits.map(async (edit) => {
      const result = await generateNewContent(
        filesContents[edit.file],
        edit.instructions,
        trace
      )
      return {
        ...edit,
        newCode: result.code,
      }
    })

    // Resolve all promises in parallel
    const updatedEdits = await Promise.all(promises)

    // Update filesContents with new code
    for (const edit of updatedEdits) {
      filesContents[edit.file] = edit.newCode
    }

    console.debug("[DEBUG] Writing new code to files")
    for (const edit of updatedEdits) {
      await fs.writeFile(`${tempDir}/${edit.file}`, edit.newCode)
    }

    console.debug("[DEBUG] Staging files")
    for (const edit of edits) {
      await git.add(`${tempDir}/${edit.file}`)
    }

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
