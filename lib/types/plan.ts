import { Integer, Node } from "neo4j-driver"

export interface PlanProperties {
  id: string
  status: "draft" | "approved" | "rejected"
  type: string
  createdAt: Date
}

export type Plan = Node<Integer, PlanProperties>
