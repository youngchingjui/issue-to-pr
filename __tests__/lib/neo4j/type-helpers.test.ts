import neo4j, { int, Integer, DateTime } from "neo4j-driver";
import {
  neo4jIntToNumber,
  numberToNeo4jInt,
  neo4jDateTimeToDate,
  dateToNeo4jDateTime,
} from "@/lib/neo4j/type-helpers";

describe("neo4jIntToNumber", () => {
  it("converts Neo4j Integer to JS number", () => {
    expect(neo4jIntToNumber(int(42))).toBe(42);
  });
  it("returns null for null/undefined", () => {
    expect(neo4jIntToNumber(null)).toBeNull();
    expect(neo4jIntToNumber(undefined)).toBeNull();
  });
  it("returns JS number as is", () => {
    expect(neo4jIntToNumber(99)).toBe(99);
    expect(neo4jIntToNumber(-500)).toBe(-500);
  });
  it("throws on invalid inputs", () => {
    expect(() => neo4jIntToNumber({} as any)).toThrow();
  });
});

describe("numberToNeo4jInt", () => {
  it("wraps JS number and string as Neo4j Integer", () => {
    const i = numberToNeo4jInt(44);
    expect(typeof i.toNumber).toBe("function");
    expect(i.toNumber()).toBe(44);
    expect(numberToNeo4jInt("88").toNumber()).toBe(88);
  });
  it("returns Integer as is if already Integer", () => {
    const orig = int(29);
    expect(numberToNeo4jInt(orig)).toBe(orig);
  });
});

describe("neo4jDateTimeToDate", () => {
  it("converts Neo4j DateTime to JS Date", () => {
    const dt = neo4j.types.DateTime.fromStandardDate(new Date("2024-06-23T20:15:30Z"));
    const jsDate = neo4jDateTimeToDate(dt);
    expect(jsDate).toBeInstanceOf(Date);
    expect(jsDate?.toISOString()).toBe("2024-06-23T20:15:30.000Z");
  });
  it("returns null for null/undefined", () => {
    expect(neo4jDateTimeToDate(null)).toBeNull();
    expect(neo4jDateTimeToDate(undefined)).toBeNull();
  });
  it("throws on invalid inputs", () => {
    expect(() => neo4jDateTimeToDate({} as any)).toThrow();
  });
});

describe("dateToNeo4jDateTime", () => {
  it("converts JS Date to Neo4j DateTime", () => {
    const date = new Date("2032-02-28T13:43:25Z");
    const dt = dateToNeo4jDateTime(date);
    expect(dt).toBeInstanceOf(Object); // Not Date, but should have toStandardDate
    expect(typeof dt.toStandardDate).toBe("function");
    expect(dt.toStandardDate().toISOString()).toBe("2032-02-28T13:43:25.000Z");
  });
  it("converts ISO string and timestamp to Neo4j DateTime", () => {
    const iso = "1999-09-09T09:09:09Z";
    const ms = Date.parse(iso);
    const dt1 = dateToNeo4jDateTime(iso);
    const dt2 = dateToNeo4jDateTime(ms);
    expect(dt1.toStandardDate().toISOString()).toBe("1999-09-09T09:09:09.000Z");
    expect(dt2.toStandardDate().toISOString()).toBe("1999-09-09T09:09:09.000Z");
  });
  it("throws for bad input", () => {
    expect(() => dateToNeo4jDateTime({} as any)).toThrow();
  });
});

