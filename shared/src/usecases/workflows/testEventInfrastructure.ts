import {
  EventPublisherPort,
  withWorkflowId,
} from "@shared/ports/events/publisher"

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function testEventInfrastructure(
  { rawPublisher }: { rawPublisher: EventPublisherPort },
  { workflowId }: { workflowId: string }
) {
  const pub = withWorkflowId(rawPublisher, workflowId)

  pub.workflow.started("Test event workflow started")
  pub.status("Initializing test steps…")

  // Simulate the kinds of events produced by autoResolveIssue and the agent
  pub.message.systemPrompt("You are a helpful coding agent")
  pub.message.userMessage("Resolve the bug described in issue #123")

  pub.message.reasoning(
    "Analyzing repository structure and selecting approach…"
  )

  pub.message.toolCall("ripgrep", "call-1", JSON.stringify({ query: "TODO:" }))
  await delay(100)
  pub.message.toolCallResult(
    "ripgrep",
    "call-1",
    JSON.stringify({ matches: ["lib/utils.ts:12: // TODO"] })
  )

  pub.llm.started("Mock LLM: generating response")
  await delay(150)
  pub.status("Mock LLM is thinking…")
  await delay(150)
  pub.message.assistantMessage(
    "Here is a mocked LLM response that represents an assistant output for testing.",
    "gpt-5"
  )

  pub.status("Finalizing…")

  await delay(100)
  pub.workflow.completed("Test event workflow completed successfully")
}
