import { Integer, Node } from "neo4j-driver"

// Unified Plan type based on merged LLM response/event and plan metadata
export interface PlanProperties {
  id: string
  status: "draft" | "approved" | "rejected" | "implemented"
  type: string // e.g., "issue_resolution"
  createdAt: Date
  // Plan metadata
  version?: string
  approvalStatus?: "pending" | "approved" | "rejected"
  editStatus?: string
  previousVersion?: string
  // LLM response fields
  content?: string
  model?: string
  labels?: string[] // For Neo4j label introspection, optional
}

// The unified Plan node: this is an Event/LLMResponse node with additional Plan props and :Plan label
export type PlanNode = Node<Integer, PlanProperties>

// Old type alias for migration/backcompat if needed
type LegacyPlan = Node<Integer, { id: string; status: string; type: string; createdAt: Date }>
