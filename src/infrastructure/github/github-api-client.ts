// src/infrastructure/github/github-api-client.ts
import getOctokit from "@/lib/github"

import type { GitHubApi } from "../../types/repository-setup"

export const createGitHubApiClient = (): GitHubApi => ({
  getRepository: async (owner: string, repo: string) => {
    const octokit = await getOctokit()

    if (!octokit) {
      throw new Error("Failed to get authenticated Octokit instance")
    }

    const { data: repoData } = await octokit.rest.repos.get({
      owner,
      repo,
    })

    return {
      clone_url: repoData.clone_url as string,
    }
  },
})
