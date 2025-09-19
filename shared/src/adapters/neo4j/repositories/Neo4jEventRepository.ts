import type { ManagedTransaction } from "neo4j-driver"
import type { EventRepository } from "@shared/ports/repositories/event.writer"
import type { TxContext } from "@shared/ports/unitOfWork"

export class Neo4jEventRepository implements EventRepository {
  constructor(private readonly tx: ManagedTransaction) {}

  async createStatus(ev: { id: string; content: string }, _txCtx: TxContext): Promise<void> {
    await this.tx.run(
      `
      CREATE (e:Event {id: $id, createdAt: datetime(), type: 'status', content: $content})
      RETURN e
      `,
      { id: ev.id, content: ev.content }
    )
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
    const props = rec?.get("e")?.properties as any
    return props ? { id: props.id as string } : null
  }

  private async findLast(workflowId: string) {
    const res = await this.tx.run(
      `MATCH (w:WorkflowRun {id: $workflowId})-[:STARTS_WITH|NEXT*]->(e:Event)
       WHERE NOT (e)-[:NEXT]->()
       RETURN e LIMIT 1`,
      { workflowId }
    )
    const rec = res.records[0]
    const props = rec?.get("e")?.properties as any
    return props ? { id: props.id as string } : null
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

