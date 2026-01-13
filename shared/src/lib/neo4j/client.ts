import { backOff } from "exponential-backoff"
import neo4j, { Driver, Session } from "neo4j-driver"

export class Neo4jClient {
  private static instance: Neo4jClient
  private driver: Driver | null = null

  private constructor() {}

  public static getInstance(): Neo4jClient {
    if (!Neo4jClient.instance) {
      Neo4jClient.instance = new Neo4jClient()
    }
    return Neo4jClient.instance
  }

  public async connect(): Promise<void> {
    if (this.driver) {
      return
    }

    const uri = process.env.NEO4J_URI || "bolt://localhost:7687"
    const user = process.env.NEO4J_USER || "neo4j"
    const password = process.env.NEO4J_PASSWORD || "password"

    try {
      this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 2000,
      })

      // Verify connection
      await this.verifyConnectivity()
    } catch (error) {
      console.error("Failed to create Neo4j driver:", error)
      throw error
    }
  }

  private async verifyConnectivity(): Promise<void> {
    if (!this.driver) {
      throw new Error("Driver not initialized")
    }

    try {
      await backOff(() => this.driver!.verifyConnectivity(), {
        numOfAttempts: 5,
        startingDelay: 1000,
      })
    } catch (error) {
      console.error("Failed to verify Neo4j connectivity:", error)
      throw error
    }
  }

  public async getSession(): Promise<Session> {
    if (!this.driver) {
      await this.connect()
    }
    return this.driver!.session()
  }

  public async close(): Promise<void> {
    if (this.driver) {
      await this.driver.close()
      this.driver = null
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const session = await this.getSession()
      await session.run("RETURN 1")
      await session.close()
      return true
    } catch (error) {
      console.error("Neo4j health check failed:", error)
      return false
    }
  }
}

export const n4j = Neo4jClient.getInstance()
