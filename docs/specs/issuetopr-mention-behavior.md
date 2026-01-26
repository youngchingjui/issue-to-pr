# @issuetopr Mention Behavior

Specifies how the app should respond when users mention @issuetopr in GitHub issues and pull requests.

## Trigger Locations

Users can mention @issuetopr in these places:

| Location | GitHub Event | When Received |
| --- | --- | --- |
| Issue comment | `issue_comment` | Immediately on post |
| PR comment | `issue_comment` | Immediately on post |
| PR review (top-level) | `pull_request_review` | When review is submitted |
| PR review comment (inline) | `pull_request_review_comment` | When review is submitted |

## The PR Review Deduplication Problem

When a user writes a GitHub PR review, they may:
1. Write inline comments on specific code lines (review comments)
2. Write a top-level summary comment
3. Submit with an overall verdict (approve/request changes/comment)

**Critical behavior:** GitHub holds all inline comments in a "pending" state until the user clicks "Submit review". At submission time, GitHub fires webhooks for:
- One `pull_request_review` event (for the review itself)
- Multiple `pull_request_review_comment` events (one per inline comment)

These webhooks arrive nearly simultaneously. If the user mentions @issuetopr in both the top-level review AND an inline comment, we would trigger duplicate workflows without deduplication.

### Deduplication Strategy

We group related webhook events using a **review correlation window**.

When we receive any PR review-related event:
1. Extract the `pull_request_review_id` from the payload (present in both event types)
2. Check if we've already processed a trigger for this review ID
3. If yes, skip processing
4. If no, mark this review ID as processed and continue

This ensures that even if a user mentions @issuetopr in both the top-level review and multiple inline comments, we only trigger one workflow.

### Implementation Notes

- The correlation window should be short (30-60 seconds) since GitHub sends these events together
- Store processed review IDs in a short-lived cache (Redis or in-memory with TTL)
- Include the review ID in workflow audit logs for debugging

## Response Behavior

### What Should Happen

When @issuetopr is mentioned, the app should:

1. **Acknowledge** - React with eyes emoji (where supported) to show we're processing
2. **Respond** - Post a comment linking to the workflow run page
3. **Execute** - Run the appropriate workflow based on context
4. **Report** - Update the user on completion or failure

### Deciding What To Do

The app should analyze the context to decide the appropriate action:

| Context | Primary Action |
| --- | --- |
| Issue with no linked PR | Create a new PR to address the issue |
| PR with feedback/requests | Apply requested changes to the PR |
| Question or clarification request | Respond with answer (no code changes) |
| Ambiguous request | Ask for clarification before acting |

### Workflow vs Conversational Response

Not every @issuetopr mention needs a full workflow. The app should distinguish:

**Run a workflow when:**
- User is asking for code changes
- User is asking to fix something
- User is asking to implement something
- Clear action is required

**Respond conversationally when:**
- User is asking a question
- User wants explanation of existing code
- User is asking for suggestions without implementation
- No clear action is implied

In ambiguous cases, default to asking for clarification rather than making assumptions.

## Context Gathering

Before taking action, the app should understand:

1. **The repository** - What kind of project, languages used, coding standards
2. **The issue/PR** - Full description, existing comments, related discussions
3. **The specific comment** - What exactly is being asked
4. **Previous interactions** - Has the user given feedback we should incorporate?

For PR review comments specifically:
- Consider the code diff being reviewed
- Consider the specific line(s) the comment is attached to
- Consider other inline comments in the same review (they may be related)

## Feedback Loop

Users should be able to iterate:

1. @issuetopr makes changes
2. User reviews and provides feedback
3. @issuetopr incorporates feedback
4. Repeat until satisfied

Each iteration should build on previous context rather than starting fresh.

## Error States

| Situation | Response |
| --- | --- |
| User unauthorized | Silent ignore (don't reveal we're watching) |
| User has no account | Reply with signup link |
| Rate limited | Reply with cooldown notice |
| Workflow fails | Reply with error details and retry guidance |
| Unclear request | Ask for clarification |

## Out of Scope (For Now)

- Proactively commenting without being mentioned
- Watching for file changes without explicit trigger
- Automated testing/CI integration
- Multi-repo operations
