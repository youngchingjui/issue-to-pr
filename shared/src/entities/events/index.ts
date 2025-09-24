import type { GithubEvent, GithubEventType } from "./GithubEvent"
import type { LLMEvent, LLMEventType } from "./LLMEvent"
import type { MessageEvent, MessageEventType } from "./MessageEvent"
import type { WorkflowEvent, WorkflowEventType } from "./WorkflowEvent"

export type AllEvents = WorkflowEvent | MessageEvent | LLMEvent | GithubEvent
export type AllEventsType =
  | WorkflowEventType
  | MessageEventType
  | LLMEventType
  | GithubEventType

export * from "./Job"
