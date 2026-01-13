import { NextResponse } from "next/server"

import { Neo4jClient } from "@/lib/neo4j/client"

export async function GET() {
  try {
    const client = Neo4jClient.getInstance()
    const isHealthy = await client.healthCheck()

    if (isHealthy) {
      return NextResponse.json(
        { message: "Connected to Neo4j" },
        { status: 200 }
      )
    } else {
      return NextResponse.json(
        { error: "Neo4j connection failed" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Neo4j health check error:", error)
    return NextResponse.json(
      { error: "Neo4j health check failed" },
      { status: 500 }
    )
  }
}
