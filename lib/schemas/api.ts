import { z } from "zod"

export const GitHubURLSchema = z
  .string({
    required_error: "Please enter a URL",
    invalid_type_error: "URL must be a string",
  })
  .url({
    message: "Please enter a valid URL",
  })
  .refine((url) => url.includes("github.com"), {
    message: "URL must be from github.com",
  })
  .refine(
    (url) => {
      // Match regular GitHub URLs
      const githubPattern =
        /github\.com\/([^\/]+)\/([^\/]+)\/(issues|pull)\/(\d+)/
      // Match GitHub API URLs
      const apiPattern = /api\.github\.com\/repos\/([^\/]+)\/([^\/]+)/
      return githubPattern.test(url) || apiPattern.test(url)
    },
    {
      message:
        "URL must be a valid GitHub issue/PR (e.g., github.com/owner/repo/issues/123) or API URL (e.g., api.github.com/repos/owner/repo)",
    }
  )
  .transform((url) => {
    // Try regular GitHub URL pattern first
    const githubMatch = url.match(
      /github\.com\/([^\/]+)\/([^\/]+)\/(issues|pull)\/(\d+)/
    )
    if (githubMatch) {
      const [, owner, repo, type, number] = githubMatch
      return {
        owner,
        repo,
        type: type === "issues" ? "issue" : "pull",
        number: parseInt(number, 10),
        fullName: `${owner}/${repo}`,
      }
    }

    // Try API URL pattern
    const apiMatch = url.match(/api\.github\.com\/repos\/([^\/]+)\/([^\/]+)/)
    if (apiMatch) {
      const [, owner, repo] = apiMatch
      return {
        owner,
        repo,
        fullName: `${owner}/${repo}`,
      }
    }

    throw new Error("Invalid GitHub URL format")
  })

export const FetchGitHubItemRequestSchema = z.object({
  type: z.enum(["issue", "pull"]),
  number: z.number(),
  fullName: z.string(),
})

export const CommentRequestSchema = z.object({
  issueNumber: z.number(),
  repoFullName: z.string().min(1),
  // apiKey: z.string().min(1), // REMOVED for server fetch only
  postToGithub: z.boolean().default(false),
})

export const ResolveRequestSchema = z.object({
  issueNumber: z.number(),
  repoFullName: z.string(),
  // apiKey: z.string(), // REMOVED
  postToGithub: z.boolean().default(false),
  createPR: z.boolean().default(false),
})
