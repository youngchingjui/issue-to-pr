import getOctokit from "."

export async function getPullRequestOnBranch({
  repo,
  branch,
}: {
  repo: string
  branch: string
}) {
  const octokit = await getOctokit()
  const user = await octokit.users.getAuthenticated()
  const userName = user.data.login
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
}: {
  repo: string
  branch: string
  title: string
  body: string
}) {
  const octokit = await getOctokit()
  const user = await octokit.users.getAuthenticated()

  const pullRequest = await octokit.pulls.create({
    owner: user.data.login,
    repo,
    title,
    body,
    head: branch,
    base: "main",
  })

  return pullRequest
}
