// This route listens for 'issues' events from GitHub webhooks and triggers a workflow
// that uses an LLM to understand a Github issue, explore possibilities, understand the codebase,
// and generate a post as a comment on the issue.

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { verifyGitHubWebhook } from "@/lib/github/verifyWebhook";
import commentOnIssue from "@/lib/workflows/commentOnIssue";
import { updateJobStatus } from "@/lib/redis";
import { GitHubRepository } from "@/lib/types";

// Secret used for verifying GitHub webhook payload signatures
const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get('x-hub-signature-256');

  // Verify webhook signature
  if (!verifyGitHubWebhook(payload, signature, GITHUB_WEBHOOK_SECRET)) {
    return new NextResponse('Invalid signature', { status: 401 });
  }

  // Parse the webhook payload
  const event = request.headers.get("x-github-event");
  const body = JSON.parse(payload);

  // Handle 'issues' event: specifically when an issue is opened
  if (event === "issues" && body.action === "opened") {
    const issueNumber = body.issue.number;
    const repo: GitHubRepository = {
      name: body.repository.name,
      full_name: body.repository.full_name
    };
    const apiKey = process.env.GITHUB_API_KEY; // Use a stored API key

    // Generate a unique job ID
    const jobId = uuidv4();
    await updateJobStatus(jobId, "Starting comment workflow from webhook");

    // Start the comment workflow
    (async () => {
      try {
        const response = await commentOnIssue(issueNumber, repo, apiKey, jobId);
        await updateJobStatus(jobId, "Completed: " + JSON.stringify(response));
      } catch (error) {
        await updateJobStatus(jobId, "Failed: " + error.message);
      }
    })();

    // Respond to GitHub to acknowledge receipt of the event
    return new NextResponse('Event received', { status: 200 });
  }

  // Return a 204 No Content for events not being handled
  return new NextResponse('No actionable event', { status: 204 });
}
