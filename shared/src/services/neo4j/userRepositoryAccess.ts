import { Neo4jGraphAdapter } from "@/shared/src/adapters/neo4j"
import type {
  UserRepoAccessInput,
  UserRepoAccessRecord,
  UserRepositoryAccessPort,
} from "@/shared/src/core/ports/graph"

// Application/service layer API. Accepts the Port so it can be unit tested.
// Provides a default that uses the Neo4jGraphAdapter.

export async function syncUserRepositoryAccess(
  input: UserRepoAccessInput,
  port: UserRepositoryAccessPort = new Neo4jGraphAdapter()
): Promise<void> {
  return port.syncUserRepositoryAccess(input)
}

export async function getUserRepositoryAccess(
  username: string,
  port: UserRepositoryAccessPort = new Neo4jGraphAdapter()
): Promise<UserRepoAccessRecord[]> {
  return port.getUserRepositoryAccess(username)
}

