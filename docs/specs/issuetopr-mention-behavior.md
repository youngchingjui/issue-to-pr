# @issuetopr Mention Behavior

Specifies how the app should respond when users mention @issuetopr in GitHub issues and pull requests.

## Use Cases

Users mention @issuetopr expecting different things depending on context. The key principle is **scope matching**: the response should match where and how the user asked.

### Quick Answer

User wants information, not code changes.

> "@issuetopr why does this function return null?"

**Expected:** A reply explaining the code. No commits, no workflow.

### Targeted Fix

User points at specific code and asks for a fix.

> "@issuetopr fix this typo" (inline comment on a specific line)

**Expected:** Fix only that line or immediate area. Don't refactor the whole file.

### Address Review Feedback

User leaves review comments requesting changes.

> "@issuetopr please address these comments"

**Expected:** Apply changes requested in the review comments. Consider all inline comments as related feedback.

### Broader PR Changes

User asks for something that affects the whole PR.

> "@issuetopr this PR needs tests"

**Expected:** Add tests across the PR, not just one file.

### Create PR from Issue

User mentions @issuetopr in an issue with no linked PR.

> "@issuetopr please fix this" (in an issue)

**Expected:** Create a new PR that addresses the issue.

### Clarification Needed

User's intent is unclear.

> "@issuetopr this doesn't look right"

**Expected:** Ask what specifically should change before making assumptions.

## Response Flow

When @issuetopr is mentioned:

1. **Acknowledge** - React with eyes emoji to show we're processing
2. **Respond** - Post a comment (with workflow link if running one)
3. **Execute** - Run the appropriate workflow, or just reply if no action needed
4. **Report** - Update the user on completion or failure

## Deciding: Reply vs Code Changes

Not every mention needs code changes.

**Just reply when:**

- User is asking a question
- User wants explanation of existing code
- User is asking for suggestions without implementation

**Make code changes when:**

- User explicitly asks for a fix or implementation
- User is giving feedback that implies changes are needed
- Clear action is required

**When ambiguous:** Ask for clarification rather than guessing.

## Scope Matching

The scope of action should match the scope of the request:

| Mention Location                       | Default Scope               |
| -------------------------------------- | --------------------------- |
| Inline comment on specific line        | That line/function          |
| Multiple inline comments in one review | All mentioned areas         |
| Top-level PR comment                   | Entire PR                   |
| Issue comment                          | Create new PR for the issue |

Users can override scope with explicit instructions ("fix this across the whole codebase").

## Context Gathering

Before taking action, understand:

1. **The repository** - Languages, coding standards, patterns
2. **The issue/PR** - Full description, existing comments, history
3. **The specific comment** - What exactly is being asked
4. **Previous interactions** - Incorporate earlier feedback

For PR review comments:

- Consider the code diff being reviewed
- Consider the specific line(s) the comment is attached to
- Consider other inline comments in the same review (they may be related)

## Feedback Loop

Users iterate until satisfied:

1. @issuetopr makes changes
2. User reviews and provides feedback
3. @issuetopr incorporates feedback
4. Repeat

Each iteration builds on previous context rather than starting fresh.

## Error States

| Situation           | Response                                    |
| ------------------- | ------------------------------------------- |
| User unauthorized   | Silent ignore (don't reveal we're watching) |
| User has no account | Reply with signup link                      |
| Rate limited        | Reply with cooldown notice                  |
| Workflow fails      | Reply with error details and retry guidance |
| Unclear request     | Ask for clarification                       |

## Trigger Locations

Users can mention @issuetopr in these places:

| Location                   | GitHub Event                  | When Received            |
| -------------------------- | ----------------------------- | ------------------------ |
| Issue comment              | `issue_comment`               | Immediately on post      |
| PR comment                 | `issue_comment`               | Immediately on post      |
| PR review (top-level)      | `pull_request_review`         | When review is submitted |
| PR review comment (inline) | `pull_request_review_comment` | When review is submitted |

## Implementation: PR Review Deduplication

When a user writes a GitHub PR review, they may:

1. Write inline comments on specific code lines
2. Write a top-level summary comment
3. Submit with an overall verdict (approve/request changes/comment)

GitHub holds all inline comments in a "pending" state until the user clicks "Submit review". At submission time, GitHub fires:

- One `pull_request_review` event (for the review itself)
- Multiple `pull_request_review_comment` events (one per inline comment)

These webhooks arrive nearly simultaneously. If the user mentions @issuetopr in multiple places, we need deduplication.

### Deduplication Strategy

Group related webhook events using a **review correlation window**.

When we receive any PR review-related event:

1. Extract the `pull_request_review_id` from the payload
2. Check if we've already processed a trigger for this review ID
3. If yes, skip processing
4. If no, mark this review ID as processed and continue

### Implementation Notes

- Correlation window should be short (30-60 seconds)
- Store processed review IDs in a short-lived cache (Redis or in-memory with TTL)
- Include the review ID in workflow audit logs for debugging
- **Note:** Verify `pull_request_review_id` field presence in actual webhook payloads before relying on it

## Out of Scope

- Proactively commenting without being mentioned
- Watching for file changes without explicit trigger
- Automated testing/CI integration
- Multi-repo operations
