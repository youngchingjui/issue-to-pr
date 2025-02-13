import crypto from "crypto";
import { NextRequest } from "next/server";
import commentOnIssue from "@/lib/workflows/commentOnIssue";
import { routeWebhookHandler } from "@/lib/webhook";

async function verifySignature(signature: string, payload: object, secret: string) {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(JSON.stringify(payload));

  const digest = `sha256=${hmac.digest("hex")}`;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-hub-signature-256") as string;
    const event = req.headers.get("x-github-event") as string;
    const payload = await req.json();
    const secret = process.env.GITHUB_WEBHOOK_SECRET;

    if (!secret) {
      return new Response("Webhook secret not configured", { status: 500 });
    }

    if (!await verifySignature(signature, payload, secret)) {
      return new Response("Invalid signature", { status: 401 });
    }

    // Check for 'issues' event and 'opened' action
    if (event === 'issues') {
      const action = payload.action;
      if (action === 'opened') {
        const issueNumber = payload.issue?.number;
        const repo = {
          name: payload.repository?.name,
          full_name: payload.repository?.full_name,
        };
        const apiKey = process.env.YOUR_API_KEY_ENV_VARIABLE;
        const jobId = 'unique-job-id'; // Potential logic for jobId generation

        // Validate parameters and execute commentOnIssue
        if (issueNumber && repo.full_name && apiKey) {
          await commentOnIssue(issueNumber, repo, apiKey, jobId);
        }
      }
    }

    routeWebhookHandler({ event, payload });

    return new Response("Webhook received", { status: 200 });
  } catch (error) {
    console.error("Error handling webhook:", error);
    return new Response("Error", { status: 500 });
  }
}
