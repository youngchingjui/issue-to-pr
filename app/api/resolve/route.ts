import { NextRequest, NextResponse } from "next/server";
import { getIssue } from "@/lib/github/issues";
import { GitHubRepository } from "@/lib/types";
import { resolveIssue } from "@/lib/workflows/resolveIssue";
import { v4 as uuidv4 } from 'uuid';

// In-memory store for job status
const jobStatusStore: { [key: string]: { status: string, progress: string } } = {};

// TypeScript type for request body
interface RequestBody {
  issueNumber: number;
  repo: GitHubRepository;
  apiKey: string;
}

export async function POST(request: NextRequest) {
  const { issueNumber, repo, apiKey }: RequestBody = await request.json();

  try {
    console.debug("[DEBUG] Starting POST request handler");

    if (typeof issueNumber !== "number") {
      console.debug("[DEBUG] Invalid issue number provided:", issueNumber);
      return NextResponse.json(
        { error: "Invalid issueNumber provided." },
        { status: 400 }
      );
    }

    // Generate a unique job ID
    const jobId = uuidv4();
    console.debug(`[DEBUG] Generated job ID: ${jobId}`);

    // Initialize job status
    jobStatusStore[jobId] = { status: 'queued', progress: '0%' };

    // Start the issue resolution in a new asynchronous task
    (async () => {
      try {
        console.debug(`[DEBUG] Fetching issue #${issueNumber}`);
        const issue = await getIssue({ repo: repo.name, issueNumber });
        jobStatusStore[jobId].progress = '30%';

        // Enter resolve issue workflow asynchronously
        await resolveIssue(issue, repo, apiKey);
        jobStatusStore[jobId].status = 'completed';
        jobStatusStore[jobId].progress = '100%';

        console.debug(`[DEBUG] Workflow for job ID ${jobId} completed successfully`);
      } catch (error) {
        jobStatusStore[jobId].status = 'failed';
        console.error(`[ERROR] Workflow failed for job ID ${jobId}:`, error);
      }
    })();

    return NextResponse.json(
      { message: "Workflow started successfully.", jobId },
      { status: 202 }
    );
  } catch (error) {
    console.error("[ERROR] Fatal error in POST handler:", error);
    return NextResponse.json(
      { error: "Failed to initiate workflow." },
      { status: 500 }
    );
  }
}

// SSE endpoint for providing real-time updates on job status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (!jobId || !jobStatusStore[jobId]) {
    return NextResponse.json(
      { error: "Invalid or missing jobId." },
      { status: 400 }
    );
  }

  return new Response(
    (async function*() {
      let previousStatus = jobStatusStore[jobId].status;

      while (previousStatus !== 'completed' && previousStatus !== 'failed') {
        const currentStatus = jobStatusStore[jobId];

        if (currentStatus.status !== previousStatus) {
          yield `data: ${JSON.stringify(currentStatus)}\n\n`;
          previousStatus = currentStatus.status;
        }

        // Sleep for a short interval before checking again
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Send final status update and end
      yield `data: ${JSON.stringify(jobStatusStore[jobId])}\n\n`;
    })(),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      },
    }
  );
}