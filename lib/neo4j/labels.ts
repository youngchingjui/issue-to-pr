export const Labels = {
  Repository: "Repository",
  Settings: "Settings",
  User: "User",
  Issue: "Issue",
  Event: "Event",
  Message: "Message",
  Plan: "Plan",
  Task: "Task",
  WorkflowRun: "WorkflowRun",
} as const

export type Label = (typeof Labels)[keyof typeof Labels]
