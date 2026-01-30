/**
 * Helper to create a real GitHub comment on an issue or PR.
 *
 * This triggers a real webhook from GitHub, which can be forwarded
 * via smee.io to the local development server for E2E testing.
 *
 * Uses fetch instead of Octokit to avoid ESM compatibility issues with Jest.
 *
 * TODO: If we can use ESM modules in our test suite, then we can use octokit directly instead of
 * fetching the installation token via HTTP.
 */

import * as crypto from "crypto"
import * as fs from "fs"

export interface CreateCommentOptions {
  /** GitHub App ID */
  appId: string
  /** Path to the GitHub App private key file (.pem) */
  privateKeyPath: string
  /** Installation ID for the repository */
  installationId: number
  /** Repository in owner/repo format */
  repoFullName: string
  /** Issue or PR number */
  issueNumber: number
  /** Comment body text */
  body: string
}

export interface CreateCommentResult {
  /** The created comment ID */
  commentId: number
  /** URL to view the comment on GitHub */
  htmlUrl: string
  /** The comment body */
  body: string
  /** When the comment was created */
  createdAt: string
}

/**
 * Generates a JWT for GitHub App authentication.
 * The JWT is used to get an installation access token.
 */
function generateAppJWT(appId: string, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iat: now - 60, // Issued 60 seconds ago to account for clock drift
    exp: now + 600, // Expires in 10 minutes
    iss: appId,
  }

  // Create JWT header and payload
  const header = { alg: "RS256", typ: "JWT" }
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString(
    "base64url"
  )
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url"
  )

  // Sign the JWT
  const signatureInput = `${encodedHeader}.${encodedPayload}`
  const sign = crypto.createSign("RSA-SHA256")
  sign.update(signatureInput)
  const signature = sign.sign(privateKey, "base64url")

  return `${encodedHeader}.${encodedPayload}.${signature}`
}

/**
 * Gets an installation access token for a GitHub App installation.
 */
async function getInstallationToken(
  appId: string,
  privateKey: string,
  installationId: number
): Promise<string> {
  const jwt = generateAppJWT(appId, privateKey)

  const response = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${jwt}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(
      `Failed to get installation token: ${response.status} ${error}`
    )
  }

  const data = (await response.json()) as { token: string }
  return data.token
}

/**
 * Creates a comment on a GitHub issue or PR using the GitHub App's installation token.
 *
 * This will trigger a real `issue_comment.created` webhook event from GitHub.
 *
 * @example
 * ```ts
 * const comment = await createGitHubComment({
 *   appId: "12345",
 *   privateKeyPath: "/path/to/private-key.pem",
 *   installationId: 67890,
 *   repoFullName: "owner/repo",
 *   issueNumber: 1,
 *   body: "@issuetopr please process this",
 * })
 *
 * console.log(`Created comment: ${comment.htmlUrl}`)
 * ```
 */
export async function createGitHubComment(
  options: CreateCommentOptions
): Promise<CreateCommentResult> {
  const {
    appId,
    privateKeyPath,
    installationId,
    repoFullName,
    issueNumber,
    body,
  } = options

  // Read the private key
  const privateKey = fs.readFileSync(privateKeyPath, "utf-8")

  // Get installation token
  const token = await getInstallationToken(appId, privateKey, installationId)

  const [owner, repo] = repoFullName.split("/")

  // Create the comment
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create comment: ${response.status} ${error}`)
  }

  const data = (await response.json()) as {
    id: number
    html_url: string
    body: string
    created_at: string
  }

  return {
    commentId: data.id,
    htmlUrl: data.html_url,
    body: data.body || "",
    createdAt: data.created_at,
  }
}

/**
 * Deletes a comment from a GitHub issue or PR.
 * Useful for cleanup after E2E tests.
 */
export async function deleteGitHubComment(options: {
  appId: string
  privateKeyPath: string
  installationId: number
  repoFullName: string
  commentId: number
}): Promise<void> {
  const { appId, privateKeyPath, installationId, repoFullName, commentId } =
    options

  const privateKey = fs.readFileSync(privateKeyPath, "utf-8")
  const token = await getInstallationToken(appId, privateKey, installationId)

  const [owner, repo] = repoFullName.split("/")

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/comments/${commentId}`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  )

  if (!response.ok && response.status !== 404) {
    const error = await response.text()
    throw new Error(`Failed to delete comment: ${response.status} ${error}`)
  }
}
