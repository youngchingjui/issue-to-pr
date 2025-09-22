import type { EventBusPort } from "@shared/ports/events/eventBus"
import { createWorkflowEventPublisher } from "@shared/ports/events/publisher"

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function testEventInfrastructure(
  { eventBus }: { eventBus: EventBusPort },
  { workflowId }: { workflowId: string }
) {
  const pub = createWorkflowEventPublisher(eventBus, workflowId)

  pub.workflow.started("Test event workflow started")
  pub.workflow.status("Initializing test steps…")

  // Simulate the kinds of events produced by autoResolveIssue and the agent
  pub.message.systemPrompt("You are a helpful coding agent")
  pub.message.userMessage("Resolve the bug described in issue #123")

  pub.message.reasoning(
    "Analyzing repository structure and selecting approach…"
  )

  pub.message.toolCall("ripgrep call-1", {
    args: { query: "TODO:" },
  })
  await delay(100)
  pub.message.toolResult("ripgrep call-1", {
    matches: ["lib/utils.ts:12: // TODO"],
  })

  pub.llm.started("Mock LLM: generating response")
  await delay(150)
  pub.workflow.status("Mock LLM is thinking…")
  await delay(150)
  pub.message.assistantMessage(
    "Here is a mocked LLM response that represents an assistant output for testing.",
    "gpt-5"
  )

  pub.workflow.status("Finalizing…")

  await delay(100)
  pub.workflow.completed("Test event workflow completed successfully")
}
