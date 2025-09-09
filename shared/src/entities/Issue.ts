import { type IssueDetails } from "@shared/ports/github/issue.reader"

/**
 * Core Issue entity following clean architecture principles.
 * This represents the business domain concept of a GitHub issue.
 */
export class Issue {
  constructor(
    public readonly ref: { repoFullName: string; number: number },
    public readonly title: string | null,
    public readonly body: string | null,
    public readonly state: "OPEN" | "CLOSED",
    public readonly url: string,
    public readonly authorLogin: string | null,
    public readonly labels: string[],
    public readonly assignees: string[],
    public readonly createdAt: string,
    public readonly updatedAt: string,
    public readonly closedAt?: string | null
  ) {}

  /**
   * Factory method to create an Issue from IssueDetails (adapter data)
   */
  static fromDetails(details: IssueDetails): Issue {
    return new Issue(
      { repoFullName: details.repoFullName, number: details.number },
      details.title,
      details.body,
      details.state,
      details.url,
      details.authorLogin,
      details.labels,
      details.assignees,
      details.createdAt,
      details.updatedAt,
      details.closedAt
    )
  }

  /**
   * Check if the issue is open and can be resolved
   */
  get isResolvable(): boolean {
    return this.state === "OPEN"
  }

  /**
   * Get a summary of the issue for LLM context
   */
  get summary(): string {
    const parts = [
      `Issue #${this.ref.number} in ${this.ref.repoFullName}`,
      this.title ? `Title: ${this.title}` : "No title",
      this.body
        ? `Description: ${this.body.substring(0, 500)}${this.body.length > 500 ? "..." : ""}`
        : "No description",
      `Labels: ${this.labels.join(", ") || "None"}`,
      `Author: ${this.authorLogin || "Unknown"}`,
    ]
    return parts.join("\n")
  }
}
