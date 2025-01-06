// Functions for accessing the Github API
// Server side
// No side effects
// All required data needs to be passed in as parameters, except for auth / session

// TODO: Move all functions below to @/lib/github/ folder
import { Octokit } from "@octokit/rest"

import { auth } from "@/auth"

import { GitHubRepository } from "./types"

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
      state: "open",
      per_page: 100,
    })

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

export async function getRepoFromString(
  owner: string,
  repo: string
): Promise<GitHubRepository> {
  const octokit = await getOctokit()
  const { data: repoData } = await octokit.rest.repos.get({
    owner,
    repo,
  })

  return repoData
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
