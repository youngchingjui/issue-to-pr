// src-oop/infrastructure/github/GitHubApiClient.ts
import getOctokit from "@/lib/github"
import { IGitHubApi } from "../../types/repository-setup"

export class GitHubApiClient implements IGitHubApi {
  async getRepository(
    owner: string,
    repo: string
  ): Promise<{ clone_url: string }> {
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
  }
}
