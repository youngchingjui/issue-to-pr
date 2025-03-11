import { NextRequest, NextResponse } from "next/server";
import { getIssue } from "@/lib/github/issues";
import { getPullRequest } from "@/lib/github/pullRequests";

async function getDetails(url: string) {
  const issueMatch = url.match(/\/issues\/(\d+)/);
  const pullRequestMatch = url.match(/\/pull\/(\d+)/);

  if (issueMatch) {
    const issueNumber = parseInt(issueMatch[1], 10);
    const repositoryFullName = extractRepoFullName(url);
    return await getIssue({ fullName: repositoryFullName, issueNumber });
  } else if (pullRequestMatch) {
    const pullNumber = parseInt(pullRequestMatch[1], 10);
    const repositoryFullName = extractRepoFullName(url);
    return await getPullRequest({ repoFullName: repositoryFullName, pullNumber });
  } else {
    throw new Error("URL does not correspond to an issue or pull request");
  }
}

function extractRepoFullName(url: string): string {
  const match = url.match(/github.com\/(.+)\/(.+?)(?=\/)/);
  if (!match) {
    throw new Error("Invalid GitHub URL");
  }
  return `${match[1]}/${match[2]}`;
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    const data = await getDetails(url);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}