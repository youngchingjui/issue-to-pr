import { Integer, Node } from "neo4j-driver"

/**
 * @deprecated This type is deprecated. Use types from the neo4j.ts file instead.
 */
export interface PlanProperties {
  id: string
  status: "draft" | "approved" | "rejected"
  type: string
  createdAt: Date
}

/**
 * @deprecated This type is deprecated. Use types from the neo4j.ts file instead.
 */
export type Plan = Node<Integer, PlanProperties>
