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
    (url) => /github\.com\/([^\/]+)\/([^\/]+)\/(issues|pull)\/(\d+)/.test(url),
    {
      message:
        "URL must be a valid GitHub issue or pull request (e.g., https://github.com/owner/repo/issues/123)",
    }
  )
  .transform((url) => {
    const match = url.match(
      /github\.com\/([^\/]+)\/([^\/]+)\/(issues|pull)\/(\d+)/
    )!
    const [, owner, repo, type, number] = match
    return {
      owner,
      repo,
      type: type === "issues" ? "issue" : "pull",
      number: parseInt(number, 10),
      fullName: `${owner}/${repo}`,
    }
  })

export const FetchGitHubItemRequestSchema = z.object({
  type: z.enum(["issue", "pull"]),
  number: z.number(),
  fullName: z.string(),
})

export const CommentRequestSchema = z.object({
  issueNumber: z.number(),
  repoFullName: z.string().min(1),
  apiKey: z.string().min(1),
})

export const ResolveRequestSchema = z.object({
  issueNumber: z.number(),
  repoFullName: z.string().min(1),
  apiKey: z.string().min(1),
})
