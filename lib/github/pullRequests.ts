import getOctokit from "@/lib/github"
import { getGithubUser } from "@/lib/github/users"

export async function getPullRequestOnBranch({
  repo,
  branch,
}: {
  repo: string
  branch: string
}) {
  const octokit = await getOctokit()
  const user = await getGithubUser()
  const userName = user.login
  const pr = await octokit.pulls.list({
    owner: userName,
    repo,
    head: `${userName}:${branch}`,
  })

  if (pr.data.length > 0) {
    return pr.data[0]
  }

  return null
}

export async function createPullRequest({
  repo,
  branch,
  title,
  body,
  issueNumber,
}: {
  repo: string
  branch: string
  title: string
  body: string
  issueNumber: number
}) {
  const octokit = await getOctokit()
  const user = await getGithubUser()

  const fullBody = `${body}\n\nCloses #${issueNumber}`;

  const pullRequest = await octokit.pulls.create({
    owner: user.login,
    repo,
    title,
    body: fullBody,
    head: branch,
    base: "main",
  })

  return pullRequest
}
