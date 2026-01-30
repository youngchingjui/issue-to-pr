/**
 * Helper to verify GitHub PR state after workflow execution.
 *
 * Uses GitHub App authentication via direct HTTP calls to avoid ESM issues with @octokit packages in Jest.
 */
import crypto from "crypto"
import fs from "fs/promises"

export interface PRVerificationResult {
  success: boolean
  details: {
    prUrl: string
    hasRecentCommits: boolean
    hasRecentComments: boolean
    recentCommitCount: number
    recentCommentCount: number
    lastCommitSha?: string
    lastCommitMessage?: string
    lastCommentBody?: string
    lastCommentAt?: string
  }
}

export interface VerifyGitHubPROptions {
  /** GitHub App ID */
  appId: string
  /** Path to the GitHub App private key file */
  privateKeyPath: string
  /** GitHub App installation ID */
  installationId: number
  /** Repository full name (owner/repo) */
  repoFullName: string
  /** Pull request number */
  pullNumber: number
  /** Timestamp to compare against (only count activity after this time) */
  sinceTimestamp: Date
}

/**
 * Creates a JWT for GitHub App authentication.
 */
function createAppJWT(appId: string, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iat: now - 60, // Issued 60 seconds ago to account for clock drift
    exp: now + 600, // Expires in 10 minutes
    iss: appId,
  }

  // Create JWT header
  const header = { alg: "RS256", typ: "JWT" }
  const headerB64 = Buffer.from(JSON.stringify(header)).toString("base64url")
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url")

  // Sign with private key
  const signInput = `${headerB64}.${payloadB64}`
  const sign = crypto.createSign("RSA-SHA256")
  sign.update(signInput)
  const signature = sign.sign(privateKey, "base64url")

  return `${signInput}.${signature}`
}

/**
 * Gets an installation access token from GitHub.
 */
async function getInstallationToken(
  appId: string,
  privateKey: string,
  installationId: number
): Promise<string> {
  const jwt = createAppJWT(appId, privateKey)

  const response = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to get installation token: ${response.status} ${text}`)
  }

  const data = (await response.json()) as { token: string }
  return data.token
}

/**
 * Makes an authenticated request to the GitHub API.
 */
async function githubFetch<T>(token: string, path: string): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`GitHub API error: ${response.status} ${text}`)
  }

  return response.json() as Promise<T>
}

interface GitHubPR {
  html_url: string
}

interface GitHubCommit {
  sha: string
  commit: {
    message: string
    author: {
      date: string
    } | null
  }
}

interface GitHubComment {
  body: string
  created_at: string
}

/**
 * Verifies that a PR has been modified by the workflow.
 *
 * Checks for:
 * 1. Recent commits pushed to the PR branch
 * 2. Recent comments on the PR (from the bot)
 *
 * @returns Verification result with details about what changes were found
 */
export async function verifyGitHubPR(
  options: VerifyGitHubPROptions
): Promise<PRVerificationResult> {
  const {
    appId,
    privateKeyPath,
    installationId,
    repoFullName,
    pullNumber,
    sinceTimestamp,
  } = options

  const [owner, repo] = repoFullName.split("/")

  // Get installation token
  const privateKey = await fs.readFile(privateKeyPath, "utf8")
  const token = await getInstallationToken(appId, privateKey, installationId)

  // Fetch PR details
  const pr = await githubFetch<GitHubPR>(
    token,
    `/repos/${owner}/${repo}/pulls/${pullNumber}`
  )
  const prUrl = pr.html_url

  // Fetch commits on the PR
  const commits = await githubFetch<GitHubCommit[]>(
    token,
    `/repos/${owner}/${repo}/pulls/${pullNumber}/commits?per_page=100`
  )

  // Filter commits that occurred after the workflow started
  const recentCommits = commits.filter((commit) => {
    const commitDate = commit.commit.author?.date
      ? new Date(commit.commit.author.date)
      : null
    return commitDate && commitDate > sinceTimestamp
  })

  // Fetch comments on the PR (issue comments)
  const comments = await githubFetch<GitHubComment[]>(
    token,
    `/repos/${owner}/${repo}/issues/${pullNumber}/comments?per_page=100&since=${sinceTimestamp.toISOString()}`
  )

  // Filter for comments created after our timestamp
  const recentComments = comments.filter((comment) => {
    const commentDate = comment.created_at ? new Date(comment.created_at) : null
    return commentDate && commentDate > sinceTimestamp
  })

  const hasRecentCommits = recentCommits.length > 0
  const hasRecentComments = recentComments.length > 0

  const lastCommit = recentCommits[recentCommits.length - 1]
  const lastComment = recentComments[recentComments.length - 1]

  return {
    success: hasRecentCommits || hasRecentComments,
    details: {
      prUrl,
      hasRecentCommits,
      hasRecentComments,
      recentCommitCount: recentCommits.length,
      recentCommentCount: recentComments.length,
      lastCommitSha: lastCommit?.sha,
      lastCommitMessage: lastCommit?.commit.message,
      lastCommentBody: lastComment?.body?.substring(0, 200), // Truncate for readability
      lastCommentAt: lastComment?.created_at,
    },
  }
}

/**
 * Waits for a specific condition on the PR to be met.
 *
 * This is useful when you need to wait for the workflow to make a specific change
 * (e.g., push a commit, post a comment) before continuing the test.
 *
 * @param options - Same as verifyGitHubPR options
 * @param condition - Function that returns true when the desired condition is met
 * @param timeoutMs - Maximum time to wait (default: 15 minutes)
 * @param pollIntervalMs - How often to check (default: 30 seconds)
 */
export async function waitForPRCondition(
  options: VerifyGitHubPROptions,
  condition: (result: PRVerificationResult) => boolean,
  timeoutMs: number = 900000, // 15 minutes
  pollIntervalMs: number = 30000 // 30 seconds
): Promise<PRVerificationResult> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    const result = await verifyGitHubPR(options)

    if (condition(result)) {
      return result
    }

    console.log(
      `[PR Verify] Waiting for condition... ` +
      `(commits: ${result.details.recentCommitCount}, ` +
      `comments: ${result.details.recentCommentCount})`
    )

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
  }

  // Return the last result even on timeout
  return verifyGitHubPR(options)
}
