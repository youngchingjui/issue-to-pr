import { getGraphQLClient } from "@/lib/github";

export async function listBranches(repoFullName: string): Promise<string[]> {
  const graphqlWithAuth = await getGraphQLClient();
  if (!graphqlWithAuth) {
    throw new Error("Could not initialize GraphQL client");
  }

  const [owner, repo] = repoFullName.split("/");
  if (!owner || !repo) {
    throw new Error("Invalid repository format. Expected 'owner/repo'");
  }

  const query = `
    query($owner: String!, $repo: String!, $perPage: Int!) {
      repository(owner: $owner, name: $repo) {
        defaultBranchRef { name }
        refs(
          refPrefix: "refs/heads/",
          first: $perPage,
          orderBy: { field: TAG_COMMIT_DATE, direction: DESC }
        ) {
          nodes {
            name
            target {
              ... on Commit {
                committedDate
              }
            }
          }
        }
      }
    }
  `;

  const variables = {
    owner,
    repo,
    perPage: 50,
  };

  type BranchesResponse = {
    repository: {
      defaultBranchRef: { name: string } | null;
      refs: {
        nodes: Array<{
          name: string;
          target: { committedDate: string } | null;
        }>;
      };
    } | null;
  };

  const response = await graphqlWithAuth<BranchesResponse>(query, variables);
  const defaultBranch = response.repository?.defaultBranchRef?.name || "";
  const branches = response.repository?.refs.nodes || [];

  const names = branches
    .map((b) => ({ name: b.name, date: b.target?.committedDate || "" }))
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime() || 0;
      const dateB = new Date(b.date).getTime() || 0;
      return dateB - dateA;
    })
    .map((b) => b.name);

  if (defaultBranch) {
    const filtered = names.filter((n) => n !== defaultBranch);
    return [defaultBranch, ...filtered];
  }
  return names;
}
