import neo4j, { int, Integer, DateTime } from "neo4j-driver";

/**
 * Converts a Neo4j Integer (or JS number) to JS number, returns null for null/undefined.
 * Throws if the value cannot be converted to a number.
 *
 * @param val number | Integer | null | undefined
 * @returns number | null
 * @example
 *   neo4jIntToNumber(int(42)) // 42
 *   neo4jIntToNumber(99)      // 99
 *   neo4jIntToNumber(null)    // null
 */
export function neo4jIntToNumber(val: number | Integer | null | undefined): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return val;
  if (typeof (val as any).toNumber === "function") return (val as Integer).toNumber();
  throw new Error("Cannot convert value to number: " + String(val));
}

/**
 * Converts a JS number, string, or Integer to a Neo4j Integer (driver type).
 * If already an Integer, returns as-is.
 *
 * @param val number | string | Integer
 * @returns Integer
 * @example
 *   numberToNeo4jInt(42)
 *   numberToNeo4jInt("103")
 *   numberToNeo4jInt(int(77))
 */
export function numberToNeo4jInt(val: number | string | Integer): Integer {
  if (typeof val === "object" && val !== null && "toNumber" in val) return val as Integer;
  return int(val);
}

/**
 * Converts Neo4j DateTime or Date object to JavaScript Date; returns null if input is nullish.
 *
 * @param val DateTime | null | undefined
 * @returns Date | null
 */
export function neo4jDateTimeToDate(val: DateTime | null | undefined): Date | null {
  if (val == null) return null;
  if (typeof (val as any).toStandardDate === "function") return (val as DateTime).toStandardDate();
  if (typeof (val as any).toJSDate === "function") return (val as DateTime).toJSDate();
  throw new Error("Cannot convert value to Date: " + String(val));
}

/**
 * Converts a JS Date, ISO string, or number (timestamp) to Neo4j DateTime. Throws for unsupported types.
 *
 * @param val Date | string | number
 * @returns DateTime
 */
export function dateToNeo4jDateTime(val: Date | string | number): DateTime {
  if (val instanceof Date) return neo4j.types.DateTime.fromStandardDate(val);
  if (typeof val === "string" || typeof val === "number") return neo4j.types.DateTime.fromStandardDate(new Date(val));
  throw new Error("Unsupported value for dateToNeo4jDateTime: " + String(val));
}

