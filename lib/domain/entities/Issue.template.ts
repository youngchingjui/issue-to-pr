// TEMPLATE: Example of how to structure a domain entity
// Remove this file once the real Issue entity is implemented

export enum IssueState {
  Open = "open",
  Closed = "closed",
}

export class Issue {
  constructor(
    public readonly number: number,
    public readonly title: string,
    public readonly body: string,
    public readonly repoFullName: string,
    private _state: IssueState,
    private _assignee?: string
  ) {}

  // ✅ Business logic methods belong in domain entities
  canBeAutoResolved(): boolean {
    return (
      this._state === IssueState.Open &&
      this.hasValidDescription() &&
      this.isNotTooComplex()
    )
  }

  assign(assignee: string): void {
    if (this._state === IssueState.Closed) {
      throw new Error("Cannot assign closed issue")
    }
    this._assignee = assignee
  }

  close(): void {
    if (!this._assignee) {
      throw new Error("Cannot close unassigned issue")
    }
    this._state = IssueState.Closed
  }

  // ✅ Private methods for internal business logic
  private hasValidDescription(): boolean {
    return this.body.trim().length >= 10
  }

  private isNotTooComplex(): boolean {
    // Business rule: issues with more than 5 "TODO" items might be too complex
    const todoCount = (this.body.match(/TODO|FIXME|BUG/gi) || []).length
    return todoCount <= 5
  }

  // ✅ Getters for controlled access to state
  get state(): IssueState {
    return this._state
  }

  get assignee(): string | undefined {
    return this._assignee
  }

  get isOpen(): boolean {
    return this._state === IssueState.Open
  }

  get isClosed(): boolean {
    return this._state === IssueState.Closed
  }
}

// ✅ Domain events for decoupled communication
export class IssueAssignedEvent {
  constructor(
    public readonly issueNumber: number,
    public readonly assignee: string,
    public readonly timestamp: Date = new Date()
  ) {}
}

export class IssueClosedEvent {
  constructor(
    public readonly issueNumber: number,
    public readonly timestamp: Date = new Date()
  ) {}
}
