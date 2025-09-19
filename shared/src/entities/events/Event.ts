import { MessageEvent, MessageEventType } from "./MessageEvent"
import { WorkflowEvent, WorkflowEventType } from "./WorkflowEvent"

export type AnyEvent = WorkflowEvent | MessageEvent
export type AnyEventType = WorkflowEventType | MessageEventType
