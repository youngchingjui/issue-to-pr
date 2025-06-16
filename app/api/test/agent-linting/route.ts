import { NextResponse } from "next/server";
import { loadAgentMessages } from "@/lib/agents/testUtils";
import { CoderAgent } from "@/lib/agents/coder";

/**
 * API endpoint for testing the agent with injected messages.
 * Call this in dev mode with POST body: { "source": "test-utils/mocks/agentTrace.json", "cutoff": 4 }
 * Or: { "source": "someDBRunId", cutoff: 5 }
 * Returns agent state after running the next step (e.g., linting logic if present)
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Test API is only available in development mode" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { source, cutoff } = body;

    // Use test fixture or DB as message source
    const messages = await loadAgentMessages({
      source: source ?? "test-utils/mocks/agentTrace.json",
      cutoff,
      fromFixture: true // Force using mock JSON for now
    });

    // Construct agent, injecting the preloaded messages
    const agent = new CoderAgent({});
    // Patch the agent's messages array directly for test/dev
    // (Assume message structure matches model)
    agent.messages = messages;

    // This is where you could invoke your linting logic IF PRESENT
    // For now, just output the agent's message state for verification
    // TODO: agent.invokeLintStepIfPresent();
    return NextResponse.json({
      ok: true,
      injectedMessages: agent.messages
    });
  } catch (error) {
    console.error("Agent-linting test error:", error);
    return NextResponse.json(
      {
        error: "Agent-linting API failed",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
