import type { GithubEvent } from "./GithubEvent"
import type { LLMEvent } from "./LLMEvent"
import type { MessageEvent } from "./MessageEvent"
import type { WorkflowEvent } from "./WorkflowEvent"

export type AllEvents = WorkflowEvent | MessageEvent | LLMEvent | GithubEvent
