import { NextApiRequest, NextApiResponse } from "next"

import { getIssue } from "@/lib/github/issues"
import { getPullRequest } from "@/lib/github/pullRequests"

/**
 * Parse a GitHub URL to extract the repo details and issue/pull request number.
 */
function parseGithubUrl(
  url: string
): {
  type: "issue" | "pull"
  owner: string
  repo: string
  number: number
} | null {
  const issueRegex = /github.com\/(.+)\/(.+)\/issues\/(\d+)/
  const pullRegex = /github.com\/(.+)\/(.+)\/pull\/(\d+)/

  let match = issueRegex.exec(url)
  if (match) {
    return {
      type: "issue",
      owner: match[1],
      repo: match[2],
      number: Number(match[3]),
    }
  }

  match = pullRegex.exec(url)
  if (match) {
    return {
      type: "pull",
      owner: match[1],
      repo: match[2],
      number: Number(match[3]),
    }
  }

  return null
}

/**
 * The handler function for the API route.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { url } = req.body

  if (!url) {
    return res.status(400).json({ error: "URL is required" })
  }

  const parsed = parseGithubUrl(url)

  if (!parsed) {
    return res.status(400).json({ error: "Invalid GitHub URL" })
  }

  const { type, owner, repo, number } = parsed

  try {
    if (type === "issue") {
      const issue = await getIssue({
        fullName: `${owner}/${repo}`,
        issueNumber: number,
      })
      return res.status(200).json(issue)
    } else if (type === "pull") {
      const pullRequest = await getPullRequest({
        repoFullName: `${owner}/${repo}`,
        pullNumber: number,
      })
      return res.status(200).json(pullRequest)
    }
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Failed to fetch details from GitHub" })
  }
}
