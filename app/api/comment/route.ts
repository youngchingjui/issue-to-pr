// This route calls a workflow that uses an LLM to understand a Github issue,
// Explore possibilities, understand the codebase,
// Then generates a post as a comment on the issue.
// The comment should include the following sections:
// - Understanding the issue
// - Possible solutions
// - Relevant code
// - Suggested plan

import { NextRequest, NextResponse } from "next/server"

import { GitHubRepository } from "@/lib/types"
import commentOnIssue from "@/lib/workflows/commentOnIssue"

// Importing UUID to generate unique job IDs
import { v4 as uuidv4 } from 'uuid';

// Simulate a database or cache to store job statuses
const jobStatus: Record<string, string> = {};

type RequestBody = {
  issueNumber: number
  repo: GitHubRepository
  apiKey: string
}

export async function POST(request: NextRequest) {
  const { issueNumber, repo, apiKey }: RequestBody = await request.json()

  // Generate a unique job ID
  const jobId = uuidv4();

  // Start the comment workflow as a background job
  (async () => {
    try {
      jobStatus[jobId] = "Processing";
      const response = await commentOnIssue(issueNumber, repo, apiKey);
      jobStatus[jobId] = "Completed: " + JSON.stringify(response);
    } catch (error) {
      jobStatus[jobId] = "Failed: " + error.message;
    }
  })();

  // Immediately return the job ID to the client
  return NextResponse.json({ jobId });
}

export function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (!jobId || !(jobId in jobStatus)) {
    return NextResponse.json({ error: "Job ID not found" }, { status: 404 });
  }

  // Set up SSE
  return new NextResponse(new ReadableStream({
    start(controller) {
      controller.enqueue(`data: ${jobStatus[jobId]}\n\n`);
      controller.close();
    },
  }), {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
