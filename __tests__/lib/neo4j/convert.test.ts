import neo4j from "neo4j-driver"

import { jsToNeo4j, neo4jToJs } from "@/lib/neo4j/convert"

describe("neo4j type converters", () => {
  it("round trips integers", () => {
    const original = 42
    const intVal = jsToNeo4j(original)
    expect(neo4j.isInt(intVal)).toBe(true)
    expect((intVal as any).toNumber()).toBe(original)
    const converted = neo4jToJs(intVal)
    expect(converted).toBe(original)
  })

  it("round trips Date objects", () => {
    const date = new Date("2021-01-01T00:00:00Z")
    const dt = jsToNeo4j(date)
    expect(dt instanceof neo4j.types.DateTime).toBe(true)
    const back = neo4jToJs(dt) as Date
    expect(back instanceof Date).toBe(true)
    expect(back.toISOString()).toBe(date.toISOString())
  })
})
