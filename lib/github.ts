import { Octokit } from "@octokit/rest"
import { generateNewContent } from "./utils"

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })

const owner = process.env.GITHUB_OWNER
const repo = process.env.GITHUB_REPO

if (!owner || !repo) {
  throw new Error(
    "GITHUB_OWNER and GITHUB_REPO environment variables must be set"
  )
}

export async function getRepositoryIssues() {
  try {
    const response = await octokit.issues.listForRepo({
      owner,
      repo,
      state: "open",
    })

    const issues = await Promise.all(
      response.data.map(async (issue) => {
        const associatedBranch = await getAssociatedBranch(issue.number)
        const pullRequest = await getAssociatedPullRequest(issue.number)

        return {
          id: issue.id,
          number: issue.number,
          title: issue.title,
          state: issue.state,
          associatedBranch,
          pullRequest,
        }
      })
    )

    return issues
  } catch (error) {
    console.error("Error fetching repository issues:", error)
    throw new Error(
      "Failed to fetch repository issues. Please check your GitHub credentials and repository settings."
    )
  }
}

async function getAssociatedBranch(issueNumber: number) {
  // This is a placeholder. You'll need to implement the logic to find associated branches.
  // It might involve searching for branches with names containing the issue number.
  return null
}

export async function getIssue(issueNumber: number) {
  const issue = await octokit.issues.get({
    owner,
    repo,
    issue_number: issueNumber,
  })
  return issue.data
}

export class GitHubError extends Error {
  constructor(message: string, public status?: number) {
    super(message)
    this.name = "GitHubError"
  }
}

export async function getFileContent(filePath: string) {
  try {
    const file = await octokit.repos.getContent({ owner, repo, path: filePath })
    return file.data
  } catch (error) {
    // Handle specific GitHub API errors
    if (error.status === 404) {
      throw new GitHubError(`File not found: ${filePath}`, 404)
    }
    if (error.status === 403) {
      throw new GitHubError("Authentication failed or rate limit exceeded", 403)
    }

    // Log unexpected errors
    console.error("Unexpected error in getFileContent:", error)
    throw new GitHubError(`Failed to fetch file content: ${error.message}`)
  }
}

export async function createGitHubBranch(branchName: string, mainRef: string) {
  await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
    sha: mainRef,
  })
}

async function getAssociatedPullRequest(issueNumber: number) {
  try {
    const response = await octokit.pulls.list({
      owner,
      repo,
      state: "open",
    })

    const associatedPR = response.data.find(
      (pr) => pr.body && pr.body.includes(`Closes #${issueNumber}`)
    )

    return associatedPR
      ? { number: associatedPR.number, url: associatedPR.html_url }
      : null
  } catch (error) {
    console.error("Error fetching associated pull request:", error)
    return null
  }
}

export async function createBranch(issueId: number) {
  // This should just create a branch off of the branch in the parameters
  // It'll use the same branch naming convention as Github, ie "250-allow-user-to-change-openai-model-for-each-run"

  console.log(`Creating branch for issue ${issueId}`)

  // Get the issue title
  const issue = await octokit.issues.get({ owner, repo, issue_number: issueId })
  const issueTitle = issue.data.title

  // Create the branch
  const branch = await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${issueTitle}`,
    sha: "main",
  })

  return branch.data.ref
}

export async function createPullRequest(issueId: number, branch: string) {
  // This should just create a pull request off of the branch in the parameters
  console.log(`Creating pull request for issue ${issueId}`)

  // Create the pull request
  const pullRequest = await octokit.pulls.create({
    owner,
    repo,
    title: `Fix issue ${issueId}`,
    head: branch,
    base: "main",
  })

  return pullRequest.data.html_url
}

export async function generateCode(issueId: number) {
  // Generate the code based off the contents of the Github issue as well as the code in the repository

  // Get the issue title and contents
  const issue = await octokit.issues.get({ owner, repo, issue_number: issueId })
  const issueTitle = issue.data.title
  const issueBody = issue.data.body

  const instructions = `
    You are a software engineer. You are given a file that contains existing code. 
    
    Here is the problem that needs to be fixed:
    Title: ${issueTitle}
    Description: ${issueBody}
  `

  const existingCode = await octokit.repos.getContent({
    owner,
    repo,
    path: "app/page.tsx",
  })

  // Use the title and contents to inform the LLM how to fix the issue
  const newCode = await generateNewContent(
    existingCode.data.toString(),
    instructions
  )

  return newCode
}

export async function commitCode(
  issueId: number,
  newCode: string,
  branch: string
) {
  // Commit the code to the branch
  console.log(`Committing code for issue ${issueId}`)

  // Create a new commit
  const commit = await octokit.git.createCommit({
    owner,
    repo,
    message: `Fix issue ${issueId}`,
    tree: newCode,
    parents: [branch],
  })

  return commit.data.sha
}

export async function gitPush(issueId: number) {
  // Push the code to the remote repository
  console.log(`Pushing code for issue ${issueId}`)
  // Example: Push commits to remote repository
}

export async function resolveIssue(issueId: number) {
  // Completely resolve the issue with AI
  // 1. Create a new branch
  // 2. Make changes to fix the issue
  // 3. Commit the changes
  // 4. Create a pull request

  // 1. Create a new branch
  const branch = await createBranch(issueId)

  // 2. Make changes to fix the issue
  const newCode = await generateCode(issueId)

  // 3. Commit the changes
  await commitCode(issueId, newCode.code, branch)

  // 4. Create a pull request
  const pullRequestUrl = await createPullRequest(issueId, branch)

  console.log(`Resolving issue ${issueId}`)
  // Example: Mark issue as resolved

  return pullRequestUrl
}
