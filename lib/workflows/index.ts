// Any workflow name to function mapping for BullMQ
import { resolveIssue } from "./resolveIssue"
import commentOnIssue from "./commentOnIssue"
import { alignmentCheck } from "./alignmentCheck"
// Add more as needed

export const workflowProcessors: Record<string, Function> = {
  resolveIssue,
  commentOnIssue,
  alignmentCheck,
}

