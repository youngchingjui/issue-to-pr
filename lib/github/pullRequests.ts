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
}: {
  repo: string
  branch: string
  title: string
  body: string
}) {
  const octokit = await getOctokit()
  const user = await getGithubUser()

  const pullRequest = await octokit.pulls.create({
    owner: user.login,
    repo,
    title,
    body,
    head: branch,
    base: "main",
  })

  return pullRequest
}

export async function trackMergedPRs({
  repo,
  tagPrefix,
  interval = 60000, // Default to check every 60 seconds
}: {
  repo: string
  tagPrefix: string
  interval?: number
}) {
  const octokit = await getOctokit()
  const user = await getGithubUser()

  const checkMergedPRs = async () => {
    try {
      const pullRequests = await octokit.pulls.list({
        owner: user.login,
        repo,
        state: 'closed',
      })

      pullRequests.data.forEach(pr => {
        if (pr.merged_at && pr.title.startsWith(tagPrefix)) {
          console.log(`Merged PR: ${pr.title} at ${pr.merged_at}`);
        }
      });
    } catch (error) {
      console.error('Error checking merged PRs:', error);
    }
  }

  // Run the check initially
  await checkMergedPRs();

  // Set up an interval to periodically check for merged PRs
  setInterval(checkMergedPRs, interval);
}
