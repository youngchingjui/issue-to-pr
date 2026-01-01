import neo4j, { Driver, Session } from "neo4j-driver"

export type Neo4jConfig = {
  uri: string
  user: string
  password: string
  maxConnectionLifetimeMs?: number
}

export type Neo4jDataSource = {
  getDriver(): Driver
  getSession(mode?: "READ" | "WRITE"): Session
}

// Factory returns a *singleton* driver accessor closed over the config
export function createNeo4jDataSource(cfg: Neo4jConfig): Neo4jDataSource {
  let driver: Driver | undefined

  function getDriver(): Driver {
    if (!driver) {
      driver = neo4j.driver(cfg.uri, neo4j.auth.basic(cfg.user, cfg.password), {
        maxConnectionLifetime: cfg.maxConnectionLifetimeMs ?? 60 * 60 * 1000,
      })
    }
    return driver
  }

  function getSession(mode: "READ" | "WRITE" = "READ"): Session {
    const access = mode === "READ" ? neo4j.session.READ : neo4j.session.WRITE
    return getDriver().session({ defaultAccessMode: access })
  }

  return { getDriver, getSession }
}
