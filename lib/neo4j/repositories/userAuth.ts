import { Integer, ManagedTransaction, Node } from "neo4j-driver"

import { Labels } from "@/lib/neo4j/labels"

export type Neo4jUserAuth = {
  username: string
  email: string
  passwordHash: string
  createdAt?: unknown
}

export async function findUserByEmail(
  tx: ManagedTransaction,
  email: string
): Promise<Neo4jUserAuth | null> {
  const res = await tx.run<{ u: Node<Integer, Neo4jUserAuth, "User"> }>(
    `
    MATCH (u:${Labels.User} {username: $email})
    RETURN u
    LIMIT 1
    `,
    { email }
  )
  const node = res.records[0]?.get("u")
  return node?.properties ?? null
}

export async function createUserWithEmailPassword(
  tx: ManagedTransaction,
  email: string,
  passwordHash: string
): Promise<Neo4jUserAuth> {
  const res = await tx.run<{ u: Node<Integer, Neo4jUserAuth, "User"> }>(
    `
    CREATE (u:${Labels.User} {
      username: $email,
      email: $email,
      passwordHash: $passwordHash,
      createdAt: datetime()
    })
    RETURN u
    `,
    { email, passwordHash }
  )
  const node = res.records[0]?.get("u")
  if (!node) throw new Error("Failed to create user")
  return node.properties
}

