// Basic Neo4j types and client setup for shared usage
// This is a minimal export to avoid duplicating the full Neo4j client logic

export interface Neo4jConfig {
  uri: string
  username: string
  password: string
}

export function getNeo4jConfig(): Neo4jConfig {
  const uri = process.env.NEO4J_URI
  const username = process.env.NEO4J_USERNAME
  const password = process.env.NEO4J_PASSWORD

  if (!uri || !username || !password) {
    throw new Error("Missing Neo4j configuration in environment variables")
  }

  return { uri, username, password }
}

// Re-export neo4j driver types for convenience
export type { Driver, Session, Transaction } from "neo4j-driver"
