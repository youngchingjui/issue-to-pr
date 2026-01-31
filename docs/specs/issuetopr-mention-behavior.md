# @issuetopr Mention Behavior

Specifies how the app responds when users mention @issuetopr in GitHub issues and pull requests.

## Getting Started

### What is @issuetopr?

@issuetopr is a GitHub bot that helps with code changes. Mention it in an issue or pull request comment, and it will respond—either answering your question or making code changes.

### Who can use it?

To use @issuetopr, you need:

1. **An Issue to PR account** - Sign up at issuetopr.com and connect your GitHub account
2. **Repository access** - Write access to the repository (or explicit approval from an admin for external contributors)

If you mention @issuetopr without an account, it will reply with a signup link.

### How do I know if a repository has @issuetopr enabled?

Repository owners install @issuetopr as a GitHub App. If you're unsure whether it's enabled, just try mentioning @issuetopr—if the bot isn't installed, nothing will happen.

## What Can You Ask?

@issuetopr handles both questions and code changes. Here are examples for different user types:

### For Developers

| Request | What happens |
| ------- | ------------ |
| "@issuetopr why does this function return null?" | Explains the code, no changes made |
| "@issuetopr fix this typo" (on a specific line) | Fixes that line only |
| "@issuetopr this PR needs tests" | Adds tests across the PR |
| "@issuetopr please address these review comments" | Applies changes from all inline comments |

### For Non-Technical Users

| Request | What happens |
| ------- | ------------ |
| "@issuetopr update the button text to say 'Submit'" | Changes the UI text |
| "@issuetopr fix the typo in the README" | Corrects the documentation |
| "@issuetopr the error message is confusing, make it clearer" | Rewrites user-facing text |
| "@issuetopr can you explain what this file does?" | Provides a plain-language explanation |

### For Issue Reporters

| Request | What happens |
| ------- | ------------ |
| "@issuetopr please fix this" (in an issue) | Creates a new PR addressing the issue |
| "@issuetopr is this related to issue #42?" | Answers the question, no code changes |

## How It Responds

When you mention @issuetopr:

1. **Acknowledges** - Adds an 👀 emoji to show it's processing
2. **Responds** - Posts a comment explaining what it will do (with a link to track progress if running a workflow)
3. **Executes** - Makes changes or provides the answer
4. **Reports** - Updates you on completion or explains any problems

## Where Changes Go

When @issuetopr makes code changes:

- **From a PR comment or review**: Changes are committed to the PR's branch
- **From an issue**: A new branch and PR are created

@issuetopr never pushes directly to `main` or other protected branches. All changes go through pull requests for review.

### Visibility

When @issuetopr makes changes, this is visible to everyone:

- Commits show @issuetopr as the author
- The PR timeline shows the bot's comments and actions
- Reviewers can see that automated assistance was used

This transparency is intentional—maintainers should always know how code was produced.

## Scope: How Much Changes?

The scope of changes matches where and how you asked:

| Where you comment | Default scope |
| ----------------- | ------------- |
| Inline comment on a specific line | That line or immediate function |
| Multiple inline comments in one review | All mentioned areas |
| Top-level PR comment | The entire PR |
| Issue comment | Creates a new PR for the issue |

### Overriding Scope

You can be explicit about scope:

- "Fix this across the whole codebase" → Expands beyond the default
- "Only fix this one line, don't touch anything else" → Restricts scope

### Selective Changes from Reviews

If you submit a review with multiple comments but only want @issuetopr to address some of them:

> "@issuetopr please fix the naming issue in comment 1 and the null check in comment 3, but leave the refactoring suggestion for now"

Be specific about which feedback to act on.

## Working with PR Reviews

### How Reviews Work with @issuetopr

When you submit a PR review, you might:

- Write inline comments on specific lines
- Write a summary comment
- Approve, request changes, or just comment

If you mention @issuetopr anywhere in a review, it processes all your inline comments as related feedback and addresses them together.

### After @issuetopr Makes Changes

Once @issuetopr commits changes in response to your review:

- Your inline comments remain visible but may show as "outdated" (normal GitHub behavior when lines change)
- You should re-review the new changes
- The PR author is still responsible for the final code quality

### Attribution

Commits made by @issuetopr are attributed to the bot, not to you or the PR author. The PR author remains responsible for reviewing and approving these changes before merge.

## Permissions & Configuration

### For Repository Maintainers

Repository admins can configure:

- **Who can trigger**: Restrict to org members, specific teams, or require approval for external contributors
- **Allowlists/blocklists**: Permit or block specific users

Default permissions:

| Repository type | Who can trigger |
| --------------- | --------------- |
| Personal repo | Owner and collaborators with write access |
| Organization repo | Org admins, repo admins, members with write access |
| External contributors | Requires explicit approval from an admin |

### For Forks and External Contributors

If you're contributing from a fork:

- You need your own Issue to PR account
- The upstream repository must have @issuetopr installed
- Admins may need to approve your access before you can trigger workflows

## Guardrails & Safety

@issuetopr has built-in protections:

- **No direct pushes to protected branches** - All changes go through PRs
- **Respects `.gitignore`** - Won't create or modify ignored files
- **Human review required** - Changes must be reviewed and merged by a human

### What It Won't Do

- Commit secrets or credentials
- Delete branches or force-push
- Merge PRs automatically
- Make changes outside the repository

### When Requests Are Infeasible

If @issuetopr can't complete a request, it will explain why:

> "I can't make this change because it would require modifying the database schema, which is outside my current capabilities. Here's what you could do instead..."

It won't silently fail or make partial changes without telling you.

## Rate Limits

To prevent abuse and manage costs:

| Limit type | Behavior when exceeded |
| ---------- | ---------------------- |
| Per-user | Cooldown notice with time until reset |
| Per-repository | Repo-wide pause with admin notification |

If you hit a rate limit, @issuetopr will tell you how long to wait.

## When Things Go Wrong

| Situation | What you'll see |
| --------- | --------------- |
| You don't have an account | Reply with signup link and instructions |
| You're not authorized | Nothing happens (silent for security) |
| Rate limited | Reply explaining the cooldown period |
| Request is unclear | Reply asking for clarification |
| Workflow fails | Reply with error details and suggestions for next steps |
| Request is infeasible | Reply explaining why and offering alternatives |

### Getting Help

If @issuetopr isn't responding as expected:

1. Check that you have an account and the repo has the app installed
2. Verify you have write access to the repository
3. Look for any error messages in the bot's replies
4. Contact support at issuetopr.com/support

## Example: End-to-End Workflow

Here's a typical flow from issue to merged PR:

1. **User creates an issue**: "The login button says 'Sign in' but should say 'Log in' for consistency"

2. **User mentions the bot**: "@issuetopr please fix this"

3. **Bot acknowledges**: Adds 👀 reaction and replies "I'll create a PR to update the button text. [View progress](#)"

4. **Bot creates PR**: Opens a PR with the text change, linked to the original issue

5. **Reviewer requests changes**: "Can you also update the tooltip to match?"

6. **User asks for follow-up**: "@issuetopr please address this feedback"

7. **Bot makes additional changes**: Commits the tooltip update to the same PR

8. **Reviewer approves**: PR is merged by a human

9. **Issue auto-closes**: GitHub closes the linked issue

## Deciding: Reply vs. Code Changes

Not every mention needs code changes.

**Just reply when:**

- User is asking a question
- User wants explanation of existing code
- Request is unclear (ask for clarification first)

**Make code changes when:**

- User explicitly asks for a fix or implementation
- User gives feedback that implies changes are needed
- Clear action is required

**When ambiguous**: Ask for clarification rather than guessing.

## Trigger Locations

You can mention @issuetopr in:

| Location | When processed |
| -------- | -------------- |
| Issue comment | Immediately |
| PR comment | Immediately |
| PR review (summary) | When review is submitted |
| PR review (inline comments) | When review is submitted |

Note: Inline review comments are held by GitHub until you submit the review. @issuetopr only sees them after submission.

## Out of Scope

@issuetopr does not:

- Comment proactively without being mentioned
- Watch for file changes without explicit trigger
- Run tests or CI pipelines
- Make changes across multiple repositories
- Take any action without a human mentioning it first
