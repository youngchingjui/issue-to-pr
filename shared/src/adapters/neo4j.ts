import neo4j, { Driver } from "neo4j-driver"

import type {
  UserRepoAccessInput,
  UserRepoAccessRecord,
  UserRepositoryAccessPort,
} from "@/shared/src/core/ports/graph"

/**
 * Minimal Neo4j adapter that implements UserRepositoryAccessPort.
 * Env vars (aligns with the app's existing lib/neo4j client):
 * - NEO4J_URI (default bolt://localhost:7687)
 * - NEO4J_USER (default neo4j)
 * - NEO4J_PASSWORD (default password)
 */
export class Neo4jGraphAdapter implements UserRepositoryAccessPort {
  private driver: Driver | null = null

  private async getDriver(): Promise<Driver> {
    if (this.driver) return this.driver
    const uri = process.env.NEO4J_URI || "bolt://localhost:7687"
    const user = process.env.NEO4J_USER || process.env.NEO4J_USERNAME || "neo4j"
    const password = process.env.NEO4J_PASSWORD || "password"
    this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
      maxConnectionPoolSize: 25,
      connectionAcquisitionTimeout: 5000,
    })
    // verify connectivity once
    await this.driver.verifyConnectivity()
    return this.driver
  }

  async syncUserRepositoryAccess(input: UserRepoAccessInput): Promise<void> {
    const driver = await this.getDriver()
    const session = driver.session()
    try {
      await session.executeWrite(async (tx) => {
        // Ensure user exists
        await tx.run(
          `MERGE (u:User {username: $username})`,
          { username: input.username }
        )

        // Upsert repositories and relationships with permissions
        await tx.run(
          `
          UNWIND $repos AS repo
          MERGE (r:Repository {fullName: repo.fullName})
          SET r.repoId = coalesce(repo.id, r.repoId)
          WITH r, repo
          MATCH (u:User {username: $username})
          MERGE (u)-[rel:HAS_ACCESS]->(r)
          SET rel.permission = repo.permission,
              rel.updatedAt = datetime()
          `,
          { username: input.username, repos: input.repos }
        )

        // Remove stale relationships not present in the provided list
        await tx.run(
          `
          MATCH (u:User {username: $username})-[rel:HAS_ACCESS]->(r:Repository)
          WHERE NOT r.fullName IN [x IN $repos | x.fullName]
          DELETE rel
          `,
          { username: input.username, repos: input.repos }
        )
      })
    } finally {
      await session.close()
    }
  }

  async getUserRepositoryAccess(username: string): Promise<UserRepoAccessRecord[]> {
    const driver = await this.getDriver()
    const session = driver.session()
    try {
      const res = await session.executeRead(async (tx) => {
        return tx.run(
          `
          MATCH (u:User {username: $username})-[rel:HAS_ACCESS]->(r:Repository)
          RETURN r.fullName AS fullName, r.repoId AS id, rel.permission AS permission
          ORDER BY toLower(fullName)
          `,
          { username }
        )
      })

      return res.records.map((rec) => ({
        fullName: rec.get("fullName"),
        id: rec.get("id") ?? undefined,
        permission: rec.get("permission"),
      }))
    } finally {
      await session.close()
    }
  }

  async close(): Promise<void> {
    if (this.driver) {
      await this.driver.close()
      this.driver = null
    }
  }
}

