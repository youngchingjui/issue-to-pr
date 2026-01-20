# Tech Specs — Workflow Authorization

## Overview

This spec defines who can trigger workflows via GitHub interactions (comments, labels, etc.) and the authorization checks performed before executing workflows.

## Authorization Matrix

### PR Comment Triggers (`@issuetopr` command)

| Author Association | Can Trigger Workflow | Rationale |
| --- | --- | --- |
| `OWNER` | ✅ Yes | Repository owner has full control |
| `MEMBER` | ✅ Yes | Organization members are trusted contributors |
| `COLLABORATOR` | ✅ Yes | Explicitly granted repo access |
| `CONTRIBUTOR` | ❌ No | Past contributions don't imply trust for automation |
| `FIRST_TIMER` | ❌ No | New contributors need vetting |
| `FIRST_TIME_CONTRIBUTOR` | ❌ No | New contributors need vetting |
| `MANNEQUIN` | ❌ No | Placeholder accounts |
| `NONE` | ❌ No | No relationship to repo |

### Additional Requirements

Beyond author association, the following checks must pass:

1. **Human user**: `commentUserType` must not be `"Bot"` (prevents bot loops)
2. **IssueToPR account**: User must have signed up for IssueToPR
3. **API key configured**: User must have added their LLM API key in settings

## Implementation

### Handler Location

`lib/webhook/github/handlers/pullRequest/comment.authorizeWorkflow.handler.ts`

### Rejection Responses

| Condition | Response |
| --- | --- |
| Not authorized (wrong association) | Posts comment explaining only owners/members/collaborators can trigger |
| User not in IssueToPR | Posts comment with signup guidance |
| Missing API key | Posts comment with settings link |

## Workflows Using This Authorization

- `createDependentPR` - Triggered via `@issuetopr` in PR comments

## Future Considerations

- Label-based triggers may use different authorization rules
- UI-initiated workflows authenticate via session (different flow)
- Webhook-initiated workflows from GitHub Apps use installation permissions

## References

- GitHub Author Association: <https://docs.github.com/en/graphql/reference/enums#commentauthorassociation>
