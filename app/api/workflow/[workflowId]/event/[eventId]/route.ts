import { NextRequest, NextResponse } from "next/server"
import { getWorkflowRunWithDetails } from "@/lib/neo4j/services/workflow"
import { getEventById, deleteEvent } from "@/lib/neo4j/services/event"

// Handles GET, PATCH, DELETE for single event under a workflow
export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: { workflowId: string; eventId: string } }
) {
  try {
    // Verify event belongs to workflow
    const details = await getWorkflowRunWithDetails(params.workflowId)
    if (!details) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }
    const found = details.events.find((e) => e.id === params.eventId)
    if (!found) {
      return NextResponse.json({ error: "Event not found for workflow" }, { status: 404 })
    }
    return NextResponse.json(found)
  } catch (e) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { workflowId: string; eventId: string } }
) {
  // Only allow update of certain fields, e.g. content, for message-type events
  try {
    const body = await request.json()
    if (!body.content || typeof body.content !== "string") {
      return NextResponse.json({ error: "Only content updates are supported" }, { status: 400 })
    }
    // Verify event belongs to workflow
    const details = await getWorkflowRunWithDetails(params.workflowId)
    if (!details) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }
    const found = details.events.find((e) => e.id === params.eventId)
    if (!found) {
      return NextResponse.json({ error: "Event not found for workflow" }, { status: 404 })
    }
    // Allow update in Neo4j for supported event types (e.g. userMessage, systemPrompt, status, error, llmResponse, toolCall, toolCallResult)
    // Let's use a generic Cypher update for the event node (if allowed)
    const session = await import("@/lib/neo4j/client").then((m) => m.n4j.getSession())
    try {
      await session.executeWrite(async (tx) => {
        await tx.run(
          `MATCH (e:Event {id: $eventId}) SET e.content = $content RETURN e`,
          { eventId: params.eventId, content: body.content }
        )
      })
    } finally {
      await session.close()
    }
    // Return updated event
    const updated = await getEventById(params.eventId)
    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { workflowId: string; eventId: string } }
) {
  try {
    // Verify event belongs to workflow
    const details = await getWorkflowRunWithDetails(params.workflowId)
    if (!details) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }
    const found = details.events.find((e) => e.id === params.eventId)
    if (!found) {
      return NextResponse.json({ error: "Event not found for workflow" }, { status: 404 })
    }
    await deleteEvent(params.eventId)
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

