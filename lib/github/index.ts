import { Octokit } from "@octokit/rest";

import { auth } from "@/auth";

export default async function getOctokit() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("User not found");
  }

  const accessToken = session.user.accessToken;
  if (!accessToken) {
    throw new Error("Access token not found");
  }

  return new Octokit({ auth: accessToken });
}

export async function getRepositories() {
  const octokit = await getOctokit();

  try {
    // Fetch the user's repositories
    const { data } = await octokit.repos.listForAuthenticatedUser({
      per_page: 100,
      sort: 'updated', // Sort by last updated by default
    });

    // Map through the repositories to extract last activity (last push date)
    const repositories = data.map(repo => ({
      name: repo.name,
      full_name: repo.full_name,
      html_url: repo.html_url,
      description: repo.description,
      language: repo.language,
      stargazers_count: repo.stargazers_count,
      last_activity: repo.pushed_at, // Extract last push date
    }));

    // If additional sort logic is needed by other date fields like creation date, implement it here
    // repositories.sort((a, b) => new Date(b.last_activity) - new Date(a.last_activity));

    return repositories;
  } catch (error) {
    throw new Error(`Failed to fetch repositories: ${error.message}`);
  }
}