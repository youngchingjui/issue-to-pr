import * as github from "./github"
import { generateNewContent } from "./utils"

export async function resolveIssue(issueId: number) {
  // Get issue details
  const issue = await github.getIssue(issueId)

  // Create branch name from issue
  const branchName = `${issueId}-${issue.title
    .toLowerCase()
    .replace(/\s+/g, "-")}`

  // Generate code based on issue
  const fileContent = await github.getFileContent("app/page.tsx")
  const instructions = `
    Title: ${issue.title}
    Description: ${issue.body}
  `
  const newCode = await generateNewContent(fileContent.toString(), instructions)

  // Create branch and PR
  const mainRef = await github.getFileContent("refs/heads/main")
  await github.createGitHubBranch(branchName, mainRef.sha)

  const pr = await github.createGitHubPR({
    title: `Fix #${issueId}: ${issue.title}`,
    branchName,
    baseBranch: "main",
    body: `Fixes #${issueId}`,
  })

  return pr.data.html_url
}

export async function getIssueWithMetadata(issue: any) {
  const pullRequests = await github.listPullRequests()
  const associatedPR = pullRequests.find(
    (pr) => pr.body && pr.body.includes(`#${issue.number}`)
  )

  return {
    id: issue.id,
    number: issue.number,
    title: issue.title,
    state: issue.state,
    pullRequest: associatedPR
      ? {
          number: associatedPR.number,
          url: associatedPR.html_url,
        }
      : null,
  }
}
