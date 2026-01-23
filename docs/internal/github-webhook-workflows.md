# Launching Workflows from GitHub

Authorized users can trigger workflows from within GitHub Issues and Pull Requests. This document outlines the authorization model, billing considerations, and operational behavior for webhook-triggered workflows.

## Architecture direction: internal event bus (web app only)

To reduce route complexity and allow a many-to-many mapping between GitHub webhooks and internal behaviors, we are introducing a lightweight, in-process event bus in the Next.js app. The flow will be:

1) Receive GitHub webhook and verify signature.
2) Parse and validate the payload at the boundary using zod (see parseGithubWebhookPayload(event, payload)).
3) Publish a typed domain event to the internal bus.
4) One or more handlers subscribe to the event type and run in parallel.

Notes

- Scope: This bus is process-local to the web app. Cross-process/app pub/sub (e.g., workers) will use a different transport and likely live in /shared.
- Location: Implementation lives under /lib (see lib/events/event-bus.ts) with GitHub parsing helpers in lib/webhook/github/parse.ts.
- Migration: The existing route handlers remain in place. We will incrementally move logic behind bus subscribers to keep risk low.

Example bus implementation

```ts
// lib/events/event-bus.ts
export type Handler<T> = (event: T) => Promise<void> | void

export class EventBus<E extends { type: string }> {
  private handlers = new Map<E["type"], Handler<any>[]>()

  on<T extends E["type"]>(type: T, handler: Handler<Extract<E, { type: T }>>) {
    const list = this.handlers.get(type) ?? []
    list.push(handler)
    this.handlers.set(type, list)
  }

  async emit(event: E) {
    const list = this.handlers.get(event.type) ?? []
    await Promise.all(list.map((h) => h(event)))
  }
}
```

Parsing helper

```ts
// lib/webhook/github/parse.ts
import { parseGithubWebhookPayload } from "@/lib/webhook/github/parse"
// Usage: const r = parseGithubWebhookPayload(event, payload)
```

---

## Entry Points

Workflows can be triggered from the following GitHub events:

- **Issues**
  - Issue comments
  - Labels (future consideration)
- **Pull Requests**
  - PR comments
  - PR review comments
  - PR reviews
  - Labels (future consideration)

## Trigger Keywords

The comment must include a trigger keyword. Currently set to `@issuetopr`, though this may change if we formalize a bot identity.

All triggers are received via GitHub webhooks.

---

## Authorization

Triggering a workflow consumes resources (LLM calls, compute, API usage). We need to ensure:

1. The person triggering is allowed to do so
2. Someone is responsible for paying for the resources
3. Abuse and spam are prevented

### Authorization Layers

Authorization requires passing multiple checks:

| Layer | Question | Failure behavior |
| --- | --- | --- |
| **GitHub permissions** | Does this user have sufficient repo access? | Silent ignore |
| **Platform account** | Does the triggering user (or repo owner) have an account with us? | Respond with signup link? |
| **Billing/quota** | Does the responsible party have available credits or quota? | Respond with upgrade prompt? |
| **Rate limits** | Has this user/repo exceeded rate limits? | Respond with cooldown notice? |
| **Bot filter** | Is this a bot account? | Silent ignore |

### GitHub Permission Defaults

Reasonable defaults for who can trigger (can be overridden by admins):

| Repo type | Authorized users |
| --- | --- |
| **Personal repo** | Owner, collaborators with write access |
| **Org repo** | Org admins, repo admins, members with write access |
| **Public repo (external contributors)** | TBD - probably require explicit allowlist or approval |

### Configuration & Tenancy

Admins can customize authorization rules:

- Allowlist/blocklist specific users
- Restrict to certain teams within an org
- Require approval for external contributors
- Set different rules for different workflow types

---

## Billing & Resource Attribution

When a workflow is triggered via webhook, the workflow will be owned by the user who triggered it, and the billing account will be the user's account.

If a user does not have a billing account with Issue To PR, but they expected to successfully trigger the workflow (they are a repo owner or contributor), then we will prompt them to sign up for an account through a follow up comment.

### Billing Scenarios to Handle

| Scenario | Behavior |
| --- | --- |
| User has account with credits | Charge user, execute workflow |
| User has account, no credits | Prompt to add credits, don't execute |
| User has no account, repo owner has credits | Require user signup |
| No one has credits | Reject with helpful message |

---

## Rate Limiting

### Dimensions to Limit

| Dimension | Purpose |
| --- | --- |
| Per user | Prevent single user abuse |
| Per repo | Prevent repo-level spam |
| Per org | Budget control for organizations |
| Per workflow type | Some workflows are more expensive |

### Cooldown Behavior

- Minimum time between triggers from same user?
- Burst allowance with refill rate?
- Hard caps vs soft caps with overage charges?

---

## Response Behavior

### Feedback Matrix

| Trigger result | Response |
| --- | --- |
| **Success** | Add reaction emoji (e.g., 👀 or 🚀) to comment, optionally reply with status |
| **Unauthorized (no GitHub perms)** | Silent ignore (don't reveal we're watching) |
| **Unauthorized (no platform account)** | Reply with signup link |
| **No API key** | Reply with link to attach API key |
| **Rate limited** | Reply with cooldown info |
| **Workflow error** | Reply with error details and support contact |
| **Workflow complete** | Reply with results/summary |

### Status Updates

For long-running workflows:

- Initial acknowledgment with estimated duration.
- Progress updates.
- Final completion message with results

### Failure Handling

- Graceful degradation
- Retry guidance
- Support escalation path

---

## Security Considerations

### Abuse Vectors to Mitigate

- **Spam triggers**: Malicious users flooding with trigger keywords
- **Cost attacks**: Triggering expensive workflows to drain someone's credits
- **Impersonation**: Forged webhook events (validate GitHub signatures)
- **Prompt injection**: Malicious content in issue/PR body affecting workflow behavior
- **Deleted/edited comments**: Handle race conditions where trigger is edited or deleted

### Safeguards

- Validate webhook signatures
- Filter bot accounts
- Implement rate limiting aggressively
- Log all trigger attempts for audit
- Consider requiring explicit opt-in per repo

---

## Audit & Logging

Track for every trigger attempt:

- Timestamp
- GitHub user who triggered
- Repo, issue/PR number
- Trigger type (comment, review, etc.)
- Authorization result (success/failure + reason)
- Workflow executed (if any)
- Resource consumption
- Billing account charged
- Outcome (success/failure)

This data is essential for:

- Billing reconciliation
- Abuse investigation
- Usage analytics
- Debugging

---

## Workflows Available

Different workflows may have different:

- Authorization requirements
- Resource costs
- Rate limits

| Workflow | Description | Authorization level | Estimated cost |
| --- | --- | --- | --- |
| (to be defined) | | | |

---

## Open Questions

1. **External contributors on public repos**: Allow them to trigger? Require approval? Charge repo owner?
2. **Workspace model**: How do repo/org-level workspaces work for billing?
3. **Free tier limits**: What's generous enough to be useful but protected from abuse?
4. **Silent vs. vocal failures**: When should we respond to unauthorized triggers?
5. **Webhook reliability**: How do we handle missed webhooks or duplicates?
6. **Multi-trigger handling**: What if one comment contains multiple trigger keywords?
