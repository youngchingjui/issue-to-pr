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

  const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
  const defaultBranch = repoData.default_branch;

  const { data } = await octokit.rest.repos.listBranches({ owner, repo, per_page: 100 });

  const branchesWithDates = await Promise.all(
    data.map(async (b) => {
      try {
        const commit = await octokit.rest.repos.getCommit({ owner, repo, ref: b.commit.sha });
        const date =
          commit.data.commit.committer?.date || commit.data.commit.author?.date || "";
        return { name: b.name, date };
      } catch {
        return { name: b.name, date: "" };
      }
    })
  );

  branchesWithDates.sort((a, b) => {
    if (a.name === defaultBranch) return -1;
    if (b.name === defaultBranch) return 1;
    return (
      (new Date(b.date).getTime() || 0) -
      (new Date(a.date).getTime() || 0)
    );
  });

  return branchesWithDates.map((b) => b.name);
}
