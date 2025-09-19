import type { ManagedTransaction, Session } from "neo4j-driver"
import type { UnitOfWork, TxContext } from "@shared/ports/unitOfWork"
import { Neo4jEventRepository } from "@shared/adapters/neo4j/repositories/Neo4jEventRepository"
import type { Neo4jConfig } from "@shared/adapters/neo4j/dataSource"
import { createNeo4jDataSource } from "@shared/adapters/neo4j/dataSource"

export class Neo4jUnitOfWork implements UnitOfWork {
  constructor(private readonly getSession: (mode?: "READ" | "WRITE") => Session) {}

  async withTransaction<T>(fn: (tx: TxContext) => Promise<T>): Promise<T> {
    const session = this.getSession("WRITE")
    try {
      const result = await session.executeWrite(async (neoTx: ManagedTransaction) => {
        const ctx: TxContext = {
          eventRepo: new Neo4jEventRepository(neoTx),
        }
        return fn(ctx)
      })
      return result
    } finally {
      await session.close()
    }
  }
}

export function createNeo4jUnitOfWork(cfg: Neo4jConfig) {
  const ds = createNeo4jDataSource(cfg)
  return new Neo4jUnitOfWork(ds.getSession)
}

