import { graphql } from "@octokit/graphql"
import { err, ok, type Result } from "@shared/entities/result"
import { GitHubAuthProvider, GitHubAuthTarget } from "@shared/ports/github/auth"
import {
  type PRFileChange,
  type PRIssueComment,
  type PRIssueLink,
  type PRReview,
  type PullRequestContext,
  type PullRequestErrors,
  type PullRequestReaderPort,
  type PullRequestRef,
} from "@shared/ports/github/pullRequest.reader"

export function makeGitHubPRGraphQLAdapter(params: {
  token: string
}): PullRequestReaderPort {
  const client = graphql.defaults({
    headers: { authorization: `token ${params.token}` },
  })

  async function getPullRequestContext(
    ref: PullRequestRef
  ): Promise<Result<PullRequestContext, PullRequestErrors>> {
    const [owner, repo] = ref.repoFullName.split("/")
    if (!owner || !repo) {
      return err("ValidationFailed", {
        message: "Invalid repoFullName. Expected 'owner/repo'",
      })
    }

    // Keep limits modest to avoid hitting GraphQL limits; callers can slice further if needed
    const variables = {
      owner,
      repo,
      pullNumber: ref.number,
      commentsLimit: 100,
      reviewsLimit: 50,
      commentsPerReview: 100,
      filesLimit: 200,
    }

    const query = `
      query getPRContext(
        $owner: String!,
        $repo: String!,
        $pullNumber: Int!,
        $commentsLimit: Int!,
        $reviewsLimit: Int!,
        $commentsPerReview: Int!,
        $filesLimit: Int!
      ) {
        repository(owner: $owner, name: $repo) {
          pullRequest(number: $pullNumber) {
            id
            number
            title
            body
            state
            isDraft
            merged
            mergedAt
            createdAt
            updatedAt
            baseRefName
            headRefName
            additions
            deletions
            changedFiles
            author { login }
            files(first: $filesLimit) {
              nodes { path additions deletions changeType }
            }
            closingIssuesReferences(first: 10) {
              nodes { number title state }
            }
            comments(first: $commentsLimit) {
              nodes { id body createdAt author { login } }
            }
            reviews(first: $reviewsLimit) {
              nodes {
                id
                body
                state
                author { login }
                submittedAt
                comments(first: $commentsPerReview) {
                  nodes {
                    id
                    body
                    author { login }
                    path
                    position
                    originalPosition
                    diffHunk
                    createdAt
                    replyTo { id }
                    pullRequestReview { id }
                  }
                }
              }
            }
          }
        }
      }
    `

    type QueryResponse = {
      repository: {
        pullRequest: {
          id: string
          number: number
          title: string
          body: string | null
          state: "OPEN" | "CLOSED" | "MERGED"
          isDraft: boolean
          merged: boolean
          mergedAt: string | null
          createdAt: string
          updatedAt: string
          baseRefName: string
          headRefName: string
          additions: number | null
          deletions: number | null
          changedFiles: number | null
          author: { login: string } | null
          files: {
            nodes: Array<{
              path: string
              additions: number | null
              deletions: number | null
              changeType?: string | null
            }>
          }
          closingIssuesReferences: {
            nodes: Array<{
              number: number
              title: string | null
              state: "OPEN" | "CLOSED"
            }>
          }
          comments: {
            nodes: Array<{
              id: string
              body: string
              createdAt: string
              author: { login: string } | null
            }>
          }
          reviews: {
            nodes: Array<{
              id: string
              body: string
              state: string
              author: { login: string } | null
              submittedAt: string
              comments: {
                nodes: Array<{
                  id: string
                  body: string
                  author: { login: string } | null
                  path: string
                  position: number | null
                  originalPosition: number | null
                  diffHunk: string
                  createdAt: string
                  replyTo: { id: string } | null
                  pullRequestReview: { id: string } | null
                }>
              }
            }>
          }
        } | null
      } | null
    }

    try {
      const data = await client<QueryResponse>(query, variables)
      const pr = data?.repository?.pullRequest
      if (!pr) {
        return err("RepoNotFound")
      }

      const files: PRFileChange[] = (pr.files?.nodes || []).map((f) => ({
        path: f.path,
        additions: f.additions,
        deletions: f.deletions,
        changeType: f.changeType ?? null,
      }))
      const linkedIssues: PRIssueLink[] = (
        pr.closingIssuesReferences?.nodes || []
      ).map((i) => ({ number: i.number, title: i.title, state: i.state }))
      const comments: PRIssueComment[] = (pr.comments?.nodes || []).map(
        (c) => ({
          id: c.id,
          body: c.body,
          createdAt: c.createdAt,
          author: c.author?.login ?? null,
        })
      )
      const reviews: PRReview[] = (pr.reviews?.nodes || []).map((r) => ({
        id: r.id,
        body: r.body,
        state: r.state,
        author: r.author?.login ?? null,
        submittedAt: r.submittedAt,
        comments:
          r.comments?.nodes.map((c) => ({
            id: c.id,
            body: c.body,
            author: c.author?.login ?? null,
            file: c.path,
            position: c.position,
            originalPosition: c.originalPosition,
            diffHunk: c.diffHunk,
            createdAt: c.createdAt,
            replyTo: c.replyTo?.id ?? null,
            reviewId: c.pullRequestReview?.id ?? null,
          })) || [],
      }))

      const context: PullRequestContext = {
        pullRequest: {
          number: pr.number,
          title: pr.title,
          body: pr.body,
          state: pr.state,
          isDraft: pr.isDraft,
          merged: pr.merged,
          mergedAt: pr.mergedAt,
          createdAt: pr.createdAt,
          updatedAt: pr.updatedAt,
          baseRefName: pr.baseRefName,
          headRefName: pr.headRefName,
          additions: pr.additions ?? undefined,
          deletions: pr.deletions ?? undefined,
          changedFiles: pr.changedFiles ?? undefined,
          author: pr.author ? { login: pr.author.login } : null,
        },
        files,
        linkedIssues,
        comments,
        reviews,
      }

      return ok(context)
    } catch (e: unknown) {
      let status: number | undefined
      let message: string | undefined
      if (
        typeof e === "object" &&
        e !== null &&
        "status" in e &&
        "message" in e &&
        typeof e.status === "number" &&
        typeof e.message === "string"
      ) {
        status = e.status
        message = e.message
      }
      if (status === 401 || status === 403)
        return err("AuthRequired", { status, message })
      if (typeof message === "string" && /rate\s*limit/i.test(message))
        return err("RateLimited", { status, message })
      if (status === 422) return err("ValidationFailed", { status, message })
      return err("Unknown", { status, message })
    }
  }

  return {
    getPullRequestContext,
  }
}

export const makeGithubPRGraphQLAdapter = (token: string) =>
  makeGitHubPRGraphQLAdapter({ token })

export const getPullRequestMetaAndLinkedIssue = async (
  repoFullName: string,
  pullNumber: number,
  auth: { authProvider: GitHubAuthProvider; authTarget: GitHubAuthTarget }
) => {
  const [owner, repo] = repoFullName.split("/")
  if (!owner || !repo) {
    throw new Error("Invalid repoFullName. Expected 'owner/repo'")
  }
  const { authProvider, authTarget } = auth

  const { graphql } = await authProvider.getClient(authTarget)

  const query = `
  query PullRequestMetaAndLinkedIssue(
    $owner: String!,
    $repo: String!,
    $number: Int!
  ) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        number
        title
        body
        headRefName
        baseRefName
        headRefOid
        baseRefOid

        closingIssuesReferences(first: 1) {
          nodes {
            number
            title
            body
          }
        }
      }
    }
  }
    `

  type PullRequestMetaAndLinkedIssueResponse = {
    repository: {
      pullRequest: {
        number: number
        title: string
        body: string | null
        headRefName: string
        baseRefName: string
        headRefOid: string
        baseRefOid: string
        closingIssuesReferences: {
          nodes: Array<{
            number: number
            title: string | null
            body: string | null
          }>
        }
      } | null
    } | null
  }

  const variables = { owner, repo, number: pullNumber }
  const response = await graphql<PullRequestMetaAndLinkedIssueResponse>(
    query,
    variables
  )
  const pr = response.repository?.pullRequest
  if (!pr) {
    throw new Error(
      `Pull request ${repoFullName}#${pullNumber} not found when fetching meta and linked issue`
    )
  }

  const [linkedIssue] = pr.closingIssuesReferences?.nodes ?? []

  return {
    number: pr.number,
    title: pr.title,
    body: pr.body,
    headRefName: pr.headRefName,
    baseRefName: pr.baseRefName,
    headRefOid: pr.headRefOid,
    baseRefOid: pr.baseRefOid,
    linkedIssue,
  }
}

export const getPullRequestDiscussionGraphQL = async (
  repoFullName: string,
  pullNumber: number,
  auth: { authProvider: GitHubAuthProvider; authTarget: GitHubAuthTarget }
) => {
  const [owner, repo] = repoFullName.split("/")
  if (!owner || !repo) {
    throw new Error("Invalid repoFullName. Expected 'owner/repo'")
  }
  const { authProvider, authTarget } = auth
  const { graphql } = await authProvider.getClient(authTarget)

  const query = `
    query PullRequestDiscussion(
      $owner: String!,
      $repo: String!,
      $number: Int!,
      $commentsFirst: Int!,
      $reviewsFirst: Int!,
      $reviewCommentsFirst: Int!
    ) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $number) {
          number
          title
          body

          # 1) Conversation tab comments
          comments(first: $commentsFirst) {
            nodes {
              author { login }
              body
              createdAt
              url
            }
          }

          # 2) Reviews with their comments (for LLM context and linkable bullets)
          reviews(first: $reviewsFirst) {
            nodes {
              author { login }
              state
              body
              submittedAt
              comments(first: $reviewCommentsFirst) {
                nodes {
                  author { login }
                  body
                  path
                  diffHunk
                  createdAt
                  url
                }
              }
            }
          }
        }
      }
    }
  `
  type QueryResponse = {
    repository: {
      pullRequest: {
        number: number
        title: string
        body: string | null
        comments: {
          nodes: Array<{
            author: { login: string } | null
            body: string
            createdAt: string
            url: string
          }>
        }
        reviews: {
          nodes: Array<{
            author: { login: string } | null
            state: string
            body: string | null
            submittedAt: string | null
            comments: {
              nodes: Array<{
                author: { login: string } | null
                body: string
                path: string
                diffHunk: string
                createdAt: string
                url: string
              }>
            }
          }>
        }
      } | null
    } | null
  }

  const commentsFirst = 100
  const reviewsFirst = 50
  const reviewCommentsFirst = 50

  const variables = {
    owner,
    repo,
    number: pullNumber,
    commentsFirst,
    reviewsFirst,
    reviewCommentsFirst,
  }

  const response = await graphql<QueryResponse>(query, variables)
  const pr = response.repository?.pullRequest
  if (!pr) {
    throw new Error(
      `Pull request ${repoFullName}#${pullNumber} not found when fetching discussion`
    )
  }

  const reviews = pr.reviews.nodes.map((r) => ({
    author: r.author,
    state: r.state,
    body: r.body,
    submittedAt: r.submittedAt,
    comments: r.comments.nodes,
  }))

  return {
    pullRequest: {
      number: pr.number,
      title: pr.title,
      body: pr.body,
    },
    comments: pr.comments.nodes,
    reviews,
  }
}
