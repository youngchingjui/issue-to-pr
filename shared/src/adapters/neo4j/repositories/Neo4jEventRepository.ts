import type { EventRepository } from "@shared/ports/repositories/event.writer"
import type { TxContext } from "@shared/ports/unitOfWork"
import type { ManagedTransaction } from "neo4j-driver"

export class Neo4jEventRepository implements EventRepository {
  constructor(private readonly tx: ManagedTransaction) {}

  async createStatus(
    ev: { id: string; content: string },
    _txCtx: TxContext
  ): Promise<void> {
    await this.tx.run(
      `
      CREATE (e:Event {id: $id, createdAt: datetime(), type: 'status', content: $content})
      RETURN e
      `,
      { id: ev.id, content: ev.content }
    )
  }

  async createGeneric(
    ev:
      | { id: string; type: "status"; content: string }
      | { id: string; type: "system_prompt"; content: string }
      | { id: string; type: "user_message"; content: string }
      | {
          id: string
          type: "assistant_message"
          content: string
          model?: string
        }
      | {
          id: string
          type: "tool_call"
          toolName: string
          toolCallId: string
          args: string
        }
      | {
          id: string
          type: "tool_call_result"
          toolName: string
          toolCallId: string
          content: string
        }
      | { id: string; type: "reasoning"; summary: string }
      | { id: string; type: "llm.started"; content?: string }
      | { id: string; type: "llm.completed"; content?: string },
    _txCtx: TxContext
  ): Promise<void> {
    switch (ev.type) {
      case "status": {
        await this.tx.run(
          `CREATE (e:Event {id: $id, createdAt: datetime(), type: 'status', content: $content}) RETURN e`,
          { id: ev.id, content: ev.content }
        )
        return
      }
      case "system_prompt": {
        await this.tx.run(
          `CREATE (e:Event:Message {id: $id, createdAt: datetime(), type: 'system_prompt', content: $content}) RETURN e`,
          { id: ev.id, content: ev.content }
        )
        return
      }
      case "user_message": {
        await this.tx.run(
          `CREATE (e:Event:Message {id: $id, createdAt: datetime(), type: 'user_message', content: $content}) RETURN e`,
          { id: ev.id, content: ev.content }
        )
        return
      }
      case "assistant_message": {
        await this.tx.run(
          `CREATE (e:Event:Message {id: $id, createdAt: datetime(), type: 'assistant_message', content: $content, model: $model}) RETURN e`,
          { id: ev.id, content: ev.content, model: ev.model ?? null }
        )
        return
      }
      case "tool_call": {
        await this.tx.run(
          `CREATE (e:Event:Message {id: $id, createdAt: datetime(), type: 'tool_call', toolName: $toolName, toolCallId: $toolCallId, args: $args}) RETURN e`,
          {
            id: ev.id,
            toolName: ev.toolName,
            toolCallId: ev.toolCallId,
            args: ev.args,
          }
        )
        return
      }
      case "tool_call_result": {
        await this.tx.run(
          `CREATE (e:Event:Message {id: $id, createdAt: datetime(), type: 'tool_call_result', toolName: $toolName, toolCallId: $toolCallId, content: $content}) RETURN e`,
          {
            id: ev.id,
            toolName: ev.toolName,
            toolCallId: ev.toolCallId,
            content: ev.content,
          }
        )
        return
      }
      case "reasoning": {
        await this.tx.run(
          `CREATE (e:Event:Message {id: $id, createdAt: datetime(), type: 'reasoning', summary: $summary}) RETURN e`,
          { id: ev.id, summary: ev.summary }
        )
        return
      }
      case "llm.started": {
        await this.tx.run(
          `CREATE (e:Event {id: $id, createdAt: datetime(), type: 'llm.started', content: $content}) RETURN e`,
          { id: ev.id, content: ev.content ?? null }
        )
        return
      }
      case "llm.completed": {
        await this.tx.run(
          `CREATE (e:Event {id: $id, createdAt: datetime(), type: 'llm.completed', content: $content}) RETURN e`,
          { id: ev.id, content: ev.content ?? null }
        )
        return
      }
    }
  }

  async appendToWorkflowEnd(
    workflowId: string,
    eventId: string,
    parentId: string | undefined,
    _txCtx: TxContext
  ): Promise<void> {
    if (parentId) {
      await this.createNext(parentId, eventId)
      return
    }

    const first = await this.findFirst(workflowId)
    if (!first) {
      await this.createStartsWith(workflowId, eventId)
      return
    }

    const last = await this.findLast(workflowId)
    if (last) {
      await this.createNext(last.id, eventId)
    } else {
      // Fallback: if no last found, set as STARTS_WITH
      await this.createStartsWith(workflowId, eventId)
    }
  }

  private async findFirst(workflowId: string) {
    const res = await this.tx.run(
      `MATCH (w:WorkflowRun {id: $workflowId})-[:STARTS_WITH]->(e:Event) RETURN e LIMIT 1`,
      { workflowId }
    )
    const rec = res.records[0]
    const props = rec?.get("e")?.properties
    return props ? { id: props.id } : null
  }

  private async findLast(workflowId: string) {
    const res = await this.tx.run(
      `MATCH (w:WorkflowRun {id: $workflowId})-[:STARTS_WITH|NEXT*]->(e:Event)
       WHERE NOT (e)-[:NEXT]->()
       RETURN e LIMIT 1`,
      { workflowId }
    )
    const rec = res.records[0]
    const props = rec?.get("e")?.properties
    return props ? { id: props.id } : null
  }

  private async createStartsWith(workflowId: string, eventId: string) {
    await this.tx.run(
      `MATCH (w:WorkflowRun {id: $workflowId}) MATCH (e:Event {id: $eventId}) CREATE (w)-[:STARTS_WITH]->(e)`,
      { workflowId, eventId }
    )
  }

  private async createNext(fromEventId: string, toEventId: string) {
    await this.tx.run(
      `
      MATCH (from:Event {id: $fromEventId})
      OPTIONAL MATCH (to:Event {id: $toEventId})
      MERGE (from)-[:NEXT]->(to)
      `,
      { fromEventId, toEventId }
    )
  }
}
