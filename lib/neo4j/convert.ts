import neo4j, { DateTime, Integer } from "neo4j-driver"

export function neo4jToJs<T>(value: T): any {
  if (value === null || value === undefined) return value
  if (neo4j.isInt(value as any)) {
    return (value as unknown as Integer).toNumber()
  }
  if (value instanceof DateTime) {
    return (value as DateTime).toStandardDate()
  }
  if (Array.isArray(value)) {
    return value.map((v) => neo4jToJs(v))
  }
  if (typeof value === "object") {
    const result: any = {}
    for (const [k, v] of Object.entries(value as any)) {
      result[k] = neo4jToJs(v)
    }
    return result
  }
  return value
}

export function jsToNeo4j<T>(value: T): any {
  if (value === null || value === undefined) return value
  if (typeof value === "number") return neo4j.int(value)
  if (value instanceof Date) return neo4j.types.DateTime.fromStandardDate(value)
  if (Array.isArray(value)) return value.map((v) => jsToNeo4j(v))
  if (typeof value === "object") {
    const result: any = {}
    for (const [k, v] of Object.entries(value as any)) {
      result[k] = jsToNeo4j(v)
    }
    return result
  }
  return value
}
