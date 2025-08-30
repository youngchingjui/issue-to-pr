export type WorkflowRunState = "pending" | "running" | "completed" | "error"
export type WorkflowRunType = "autoResolveIssue" | "resolveIssue"

export interface WorkflowRunSnapshot {
  id: string
  type: WorkflowRunType
  state: WorkflowRunState
  startedAt?: string
  completedAt?: string
  failedAt?: string
  errorMessage?: string
}

export interface WorkflowRunCreateParams {
  id: string
  type: WorkflowRunType
}

/**
 * Pure domain entity representing a workflow run lifecycle.
 * Holds state and enforces valid transitions; no IO or provider types.
 */
export class WorkflowRun {
  private _id: string
  private _type: WorkflowRunType
  private _state: WorkflowRunState
  private _startedAt?: string
  private _completedAt?: string
  private _errorMessage?: string

  private constructor(snapshot: WorkflowRunSnapshot) {
    assertNonEmptyString(snapshot.id, "id")
    assertNonEmptyString(snapshot.type, "type")

    this._id = snapshot.id
    this._type = snapshot.type
    this._state = snapshot.state
    this._startedAt = snapshot.startedAt
    this._completedAt = snapshot.completedAt
    this._errorMessage = snapshot.errorMessage
  }

  static create(params: WorkflowRunCreateParams): WorkflowRun {
    return new WorkflowRun({
      id: params.id,
      type: params.type,
      state: "pending",
    })
  }

  static rehydrate(snapshot: WorkflowRunSnapshot): WorkflowRun {
    return new WorkflowRun(snapshot)
  }

  get id(): string {
    return this._id
  }
  get type(): string {
    return this._type
  }
  get state(): WorkflowRunState {
    return this._state
  }
  get startedAt(): string | undefined {
    return this._startedAt
  }
  get completedAt(): string | undefined {
    return this._completedAt
  }
  get errorMessage(): string | undefined {
    return this._errorMessage
  }

  /** Transition: pending -> running */
  start(at: string): void {
    assertIsoString(at, "startedAt")
    if (this._state !== "pending") {
      throw new Error(`Cannot start workflow from state ${this._state}`)
    }
    this._state = "running"
    this._startedAt = at
  }

  /** Transition: running -> completed */
  complete(at: string): void {
    assertIsoString(at, "completedAt")
    if (this._state !== "running") {
      throw new Error(`Cannot complete workflow from state ${this._state}`)
    }
    this._state = "completed"
    this._completedAt = at
  }

  /** Transition: pending|running -> error */
  fail(reason: unknown, at: string): void {
    assertIsoString(at, "failedAt")
    if (this._state === "completed" || this._state === "error") {
      throw new Error(`Cannot fail workflow from state ${this._state}`)
    }
    this._state = "error"
    this._errorMessage = stringifyReason(reason)
  }

  isTerminal(): boolean {
    return this._state === "completed" || this._state === "error"
  }

  toSnapshot(): WorkflowRunSnapshot {
    return {
      id: this._id,
      type: this._type,
      state: this._state,
      startedAt: this._startedAt,
      completedAt: this._completedAt,
      errorMessage: this._errorMessage,
    }
  }
}

function assertNonEmptyString(
  value: unknown,
  name: string
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} must be a non-empty string`)
  }
}

function assertIsoString(
  value: unknown,
  name: string
): asserts value is string {
  assertNonEmptyString(value, name)
  const date = new Date(value as string)
  if (isNaN(date.getTime())) {
    throw new Error(`${name} must be an ISO-8601 string`)
  }
}

function stringifyReason(reason: unknown): string {
  if (reason instanceof Error) return reason.message
  if (typeof reason === "string") return reason
  try {
    return JSON.stringify(reason)
  } catch {
    return String(reason)
  }
}

export default WorkflowRun
