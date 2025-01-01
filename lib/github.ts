// Functions for accessing the Github API
// Server side
// No side effects
// All required data needs to be passed in as parameters, except for auth / session

import { Octokit } from "@octokit/rest"

import { auth } from "@/auth"

import { generateNewContent } from "./utils"

async function getOctokit() {
  const session = await auth()
  if (!session?.user) {
    throw new Error("User not found")
  }

  const accessToken = session.user.accessToken
  if (!accessToken) {
    throw new Error("Access token not found")
  }

  return new Octokit({ auth: accessToken })
}

export interface Issue {
  id: number
  number: number
  title: string
  body: string
  state: string
}

export async function getRepositoryIssues(
  username: string,
  repo: string
): Promise<Issue[]> {
  try {
    const octokit = await getOctokit()
    const response = await octokit.issues.listForRepo({
      owner: username,
      repo,
      state: "all",
      per_page: 100,
    })

    console.debug("[DEBUG] Issues response:", response.data)
    const issues = await Promise.all(
      response.data.map(async (issue) => {
        return {
          id: issue.id,
          number: issue.number,
          title: issue.title,
          body: issue.body,
          state: issue.state,
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

export async function getAssociatedBranch() {
  // This is a placeholder. You'll need to implement the logic to find associated branches.
  // It might involve searching for branches with names containing the issue number.
  return null
}

export async function getIssue(
  repo: string,
  issueNumber: number
): Promise<Issue> {
  const octokit = await getOctokit()
  const user = await octokit.users.getAuthenticated()
  const issue = await octokit.issues.get({
    owner: user.data.login,
    repo,
    issue_number: issueNumber,
  })
  return issue.data as Issue
}

export class GitHubError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message)
    this.name = "GitHubError"
  }
}

export async function getFileContent(
  repoOwner: string,
  repoName: string,
  filePath: string
) {
  try {
    const octokit = await getOctokit()
    const file = await octokit.repos.getContent({
      owner: repoOwner,
      repo: repoName,
      path: filePath,
    })
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

export async function createGitHubBranch(
  repoOwner: string,
  repoName: string,
  branchName: string,
  mainRef: string
) {
  const octokit = await getOctokit()
  await octokit.git.createRef({
    owner: repoOwner,
    repo: repoName,
    ref: `refs/heads/${branchName}`,
    sha: mainRef,
  })
}

export async function getAssociatedPullRequest(
  repoOwner: string,
  repoName: string,
  issueNumber: number
) {
  try {
    const octokit = await getOctokit()
    const response = await octokit.pulls.list({
      owner: repoOwner,
      repo: repoName,
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

export async function createBranch(
  repoOwner: string,
  repoName: string,
  issueId: number
) {
  // This should just create a branch off of the branch in the parameters
  // It'll use the same branch naming convention as Github, ie "250-allow-user-to-change-openai-model-for-each-run"

  console.log(`Creating branch for issue ${issueId}`)

  // Get the issue title
  const octokit = await getOctokit()
  const issue = await octokit.issues.get({
    owner: repoOwner,
    repo: repoName,
    issue_number: issueId,
  })
  const issueTitle = issue.data.title

  // Create the branch
  const branch = await octokit.git.createRef({
    owner: repoOwner,
    repo: repoName,
    ref: `refs/heads/${issueTitle}`,
    sha: "main",
  })

  return branch.data.ref
}

export async function createPullRequest(
  repoOwner: string,
  repoName: string,
  issueId: number,
  branch: string
) {
  // This should just create a pull request off of the branch in the parameters
  console.log(`Creating pull request for issue ${issueId}`)

  // Create the pull request
  const octokit = await getOctokit()
  const pullRequest = await octokit.pulls.create({
    owner: repoOwner,
    repo: repoName,
    title: `Fix issue ${issueId}`,
    head: branch,
    base: "main",
  })

  return pullRequest
}

export async function generateCode(
  owner: string,
  repo: string,
  issueId: number
) {
  // Generate the code based off the contents of the Github issue as well as the code in the repository

  // Get the issue title and contents
  const octokit = await getOctokit()
  const issue = await octokit.issues.get({
    owner,
    repo,
    issue_number: issueId,
  })
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
  repoOwner: string,
  repoName: string,
  issueId: number,
  newCode: string,
  branch: string
) {
  // Commit the code to the branch
  console.log(`Committing code for issue ${issueId}`)

  // Create a new commit
  const octokit = await getOctokit()
  const commit = await octokit.git.createCommit({
    owner: repoOwner,
    repo: repoName,
    message: `Fix issue ${issueId}`,
    tree: newCode,
    parents: [branch],
  })

  return commit.data.sha
}

export async function gitPush(
  repoOwner: string,
  repoName: string,
  issueId: number
) {
  // Push the code to the remote repository
  console.log(`Pushing code for issue ${issueId}`)
  // Example: Push commits to remote repository
}

export async function resolveIssue(
  repoOwner: string,
  repoName: string,
  issueId: number
) {
  // Completely resolve the issue with AI
  // 1. Create a new branch
  // 2. Make changes to fix the issue
  // 3. Commit the changes
  // 4. Create a pull request

  // 1. Create a new branch
  const branch = await createBranch(repoOwner, repoName, issueId)

  // 2. Make changes to fix the issue
  const newCode = await generateCode(repoOwner, repoName, issueId)

  // 3. Commit the changes
  await commitCode(repoOwner, repoName, issueId, newCode.code, branch)

  // 4. Create a pull request
  const pullRequestUrl = await createPullRequest(
    repoOwner,
    repoName,
    issueId,
    branch
  )

  console.log(`Resolving issue ${issueId}`)
  // Example: Mark issue as resolved

  return pullRequestUrl
}
