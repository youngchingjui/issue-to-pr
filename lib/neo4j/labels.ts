export const Labels = {
  Repository: "Repository",
  Settings: "Settings",
  Issue: "Issue",
  Event: "Event",
  Message: "Message",
  Plan: "Plan",
  WorkflowRun: "WorkflowRun",
} as const

export type Label = (typeof Labels)[keyof typeof Labels]
