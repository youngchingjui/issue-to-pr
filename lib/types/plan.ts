// EXTENDED PLAN TYPE (not deprecated): used for application logic/UI sync
export interface PlanSyncMetadata {
  sourceOfTruth: 'neo4j' | 'github_comment'
  githubCommentId?: number | null
  syncStatus?: 'synced' | 'unsynced' | 'pending' // planning for extras
  syncTimestamp?: Date | null
  // Fields for metadata append on comment (for display/debug)
  lastCommit?: string | null
}

// Application-level Plan (extends zod Plan, may include sync metadata)
export type PlanWithSyncMeta = import("@/lib/types").Plan & PlanSyncMetadata
