/**
 * TEST-ONLY WORKFLOW
 *
 * This use case exists solely to exercise and validate the event infrastructure
 * (Event Bus, publishing, and persistence). It should be removed once the
 * event bus is fully implemented in our clean architecture and integrated
 * across real workflows.
 */
import { v4 as uuidv4 } from "uuid"

import type { EventBusPort } from "@shared/ports/events/eventBus"
import { createWorkflowEventPublisher } from "@shared/ports/events/publisher"

export interface TestEventInfrastructureParams {
  /** Optional workflow id for emitting events; a new one will be generated if omitted */
  workflowId?: string
}

export interface TestEventInfrastructurePorts {
  eventBus?: EventBusPort
}

export async function testEventInfrastructure(
  ports: TestEventInfrastructurePorts,
  params: TestEventInfrastructureParams = {}
): Promise<{ workflowId: string }> {
  const workflowId = params.workflowId ?? uuidv4()
  const pub = createWorkflowEventPublisher(ports.eventBus, workflowId)

  // Simulate a small sequence of events, including mocked LLM steps
  pub.workflow.started("Test event workflow started")
  pub.status("Initializing test steps…")

  // Mock a short-running LLM step
  pub.llm.started("Mock LLM: generating response")
  await delay(150)
  pub.status("Mock LLM is thinking…")
  await delay(150)
  pub.llm.completed(
    "Here is a mocked LLM response that represents an assistant output for testing."
  )

  pub.status("Finalizing…")
  await delay(100)
  pub.workflow.completed("Test event workflow completed")

  return { workflowId }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export default testEventInfrastructure

