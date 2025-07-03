import getOctokit from "@/lib/github";

export async function listBranches(repoFullName: string): Promise<string[]> {
  const octokit = await getOctokit();
  if (!octokit) {
    throw new Error("No octokit instance available");
  }
  const [owner, repo] = repoFullName.split("/");
  if (!owner || !repo) {
    throw new Error("Invalid repository format. Expected 'owner/repo'");
  }
  const { data } = await octokit.rest.repos.listBranches({ owner, repo, per_page: 100 });
  return data.map((b) => b.name);
}
